//@ts-check
/*
  Copyright: (c) 2019, Guilherme Francescon Cittolin <gfcittolin@gmail.com>
  GNU General Public License v3.0+ (see LICENSE or https://www.gnu.org/licenses/gpl-3.0.txt)
*/

const { EventEmitter } = require('events');
const util = require('util');
const net = require('net');
const os = require('os');
const debug = util.debuglog('netdde');
let netKeepAlive;
try {
    netKeepAlive = require('net-keepalive');
} catch (e) {}

const C = require('../constants');
const NetDDEClientEndpoint = require('./endpoint');
const helper = require('../helper');

const CONN_DISCONNECTED = 0;
const CONN_CONNECTING = 1;
const CONN_CONNECTED = 2;
const CONN_DISCONNECTING = 3;

class NetDDEClient extends EventEmitter {

    constructor(service, opts) {
        super();
        debug('new NetDDEClient');

        if (!service) {
            throw new Error("Service expected!")
        }

        this._transport = opts.transport || 'tcp';
        this._host = opts.host || '127.0.0.1';
        this._port = opts.port || 8888;
        this._config = {
            service: service,
            computer: opts.computer || os.hostname(),
            user: opts.user || os.userInfo().username,
            process: opts.process || process.argv0
        }
        this._timeout = isNaN(opts.timeout) ? 10000 : opts.timeout;

        this._reset();
    }

    _reset() {
        debug('NetDDEClient _reset');
        this._socket = null;
        this._ep = null;
        this._connectionState = CONN_DISCONNECTED;
        /** Maps topic -> pointer */
        this._convPtrs = new Map();
        /** Maps pointer -> topic */
        this._convTopics = new Map();
        /** Maps topic -> ID */
        this._convIDs = new Map();
        /** locks when creating topics */
        this._convLocks = new Map();
    }

    _onSocketError(e) {
        debug('NetDDEClient _onSocketError', e);

        this._destroy();
        this.emit('error', e);
    }

    _onSocketClose() {
        debug('NetDDEClient _onSocketClose');

        this._destroy();
    }

    _onEndpointTimeout() {
        debug('NetDDEClient _onEndpointTimeout');

        this._destroy();
    }

    _onEndpointError(e) {
        debug('NetDDEClient _onEndpointError', e);

        this._destroy();
        this.emit('error', e);
    }

    /**
     * Handles event caused when receiving a NETDDE_SERVER_DISCONNECT,
     * triggered when the whole server is closing. All conversations were 
     * already closed on the server side.
     * @private
     * @param {*} d 
     */
    _onDDEServerDisconnect(d) {
        debug('NetDDEClient _onDDEServerDisconnect', d);

        this._connectionState = CONN_DISCONNECTING;

        this._dropConnection().catch(e => this.emit('error', e));
    }


    /**
     * Handles event caused when receiving a DDE_DISCONNECT,
     * triggered when the a single conversation is closing.
     * @private
     * @param {*} d 
     */
    _onDDEDisconnect(d) {
        debug('NetDDEClient _onDDEDisconnect', d);

        let convPtr = d.convPtr;
        let topic = this._convTopics.get(convPtr);

        this._convPtrs.delete(topic);
        this._convIDs.delete(topic);
        this._convTopics.delete(convPtr);

        this.emit('topic_disconnect', topic);
    }

    /**
     * Handles event caused when receiving a DDE_ADVISE
     * @private
     * @param {*} d 
     */
    _onDDEAdvise(d) {
        debug('NetDDEClient _onDDEAdvise', d);

        let topic = this._convTopics.get(d.convPtr);
        if (!topic) {
            this.emit('error', new Error(`Unknown pointer [${d.convPtr && d.convPtr.toString(16)}] received on DDE_ADVISE`));
            return;
        }

        let evtData = {
            topic: topic,
            item: d.item,
            format: d.format,
            data: helper.decodeFormat(d.format, d.data)
        }
        this.emit('advise', evtData);
    }

    _onDDEAdviceStartFailed(d) {
        debug('NetDDEClient _onDDEAdviceStartFailed', d);

        // we shouldn't receive this, as we always set async to false on advise()
    }

    _destroy() {
        debug('NetDDEClient _destroy');

        this._connectionState = CONN_DISCONNECTING;

        if (this._ep) {
            this._ep.destroy();
        }

        if (this._socket) {
            this._socket.destroy();
        }

        if (this._convLocks) {
            for (const lock of this._convLocks.values()) {
                lock.reset();
            }
            this._convLocks.clear();
        }

        this._reset();
        this.emit('close')
    }

    /**
     * @private
     */
    async _dropConnection() {
        debug('NetDDEClient _dropConnection');

        let pDisconnect = new Promise(async (res, rej) => {

            if (this._convLocks) {
                for (const lock of this._convLocks.values()) {
                    lock.reset();
                }
                this._convLocks.clear();
            }

            if (this._ep) {
                await this._ep.sendPacket(C.NETDDE_CLIENT_DISCONNECT, {
                    service: this._config.service,
                    computer: this._config.computer
                });
                this._ep.destroy();
            }

            if (this._socket) {
                this._socket.end();
                this.on('close', () => res())
            } else {
                res();
            }
        });

        let pTimeout = new Promise((res, rej) => {
            setTimeout(() => {
                rej(new Error("Timeout while disconnecting"));
                this._destroy();
            }, 5000)
        });
        return Promise.race([pDisconnect, pTimeout]);
    }

    /**
     * Creates DDE conversation with the server by sending
     * a DDE_CREATE_CONVERSATION packet
     * @private
     * @param {string} topic 
     */
    async _createConversation(topic) {
        debug('NetDDEClient _createConversation', topic);

        let res = await this._ep.sendPacket(C.DDE_CREATE_CONVERSATION, {
            service: this._config.service,
            topic: topic
        });

        if (!res.result) throw new Error(`Server reported error creating DDE conversation on topic "${topic}"`);

        this._convPtrs.set(topic, res.convPtr);
        this._convIDs.set(topic, res.convId);
        this._convTopics.set(res.convPtr, topic);
    }

    async _destroyConversation(topic) {
        debug('NetDDEClient _destroyConversation', topic);

        let convPtr = this._convPtrs.get(topic);
        let convId = this._convIDs.get(topic);

        if (!convPtr || !convId) {
            debug('NetDDEClient _destroyConversation no-ptr-id', topic, convPtr, convId);
            return;
        }

        this._convPtrs.delete(topic);
        this._convIDs.delete(topic);
        this._convTopics.delete(convPtr);

        await this._ep.sendPacket(C.DDE_DESTROY_CONVERSATION, { convPtr, convId });
    }

    async _destroyAllConversations() {
        debug('NetDDEClient _destroyAllConversations');

        let topics = this._convPtrs.keys();
        for (const topic of topics) {
            // there's no response to this, so no worries about await inside for loop
            await this._destroyConversation(topic);
        }
    }

    /**
     * Gets the conversation pointer/id for a given topic, creating
     * the conversation if necessary
     * @private
     * @param {string} topic 
     */
    async _getConversation(topic) {
        debug('NetDDEClient _getConversation', topic);
        
        if (!this._convPtrs.has(topic)) {
            
            //get lock to prevent creating multiple conversations to the same topic
            let lock = this._convLocks.get(topic)
            if (!lock) {
                lock = new helper.AwaitLock();
                this._convLocks.set(topic, lock);
            }

            await lock.acquire();
            try {
                if (!this._convPtrs.has(topic)) {
                    await this._createConversation(topic);
                } //else we already have the conversation, so do nothing
            } finally {
                lock.release();
            }
        }

        return {
            ptr: this._convPtrs.get(topic),
            id: this._convIDs.get(topic)
        }
    }

    /**
     * Creates the endpoint and sends the connect packet
     * @private
     */
    async _connectNetDDE() {
        debug('NetDDEClient _connectNetDDE');

        this._ep = new NetDDEClientEndpoint(this._socket, { timeout: this._timeout });
        this._ep.on('error', e => this._onEndpointError(e));
        this._ep.on('timeout', () => this._onEndpointTimeout());
        this._ep.on('dde_server_disconnect', d => this._onDDEServerDisconnect(d));
        this._ep.on('dde_disconnect', d => this._onDDEDisconnect(d));
        this._ep.on('dde_advise', d => this._onDDEAdvise(d));
        this._ep.on('dde_advise_start_failed', d => this._onDDEAdviceStartFailed(d));

        let res = await this._ep.sendPacket(C.NETDDE_CLIENT_CONNECT, {
            service: this._config.service,
            computer: this._config.computer,
            user: this._config.user,
            process: this._config.process,
            version: "v2.0"
        });

        if (!res.result) {
            throw new Error("Server reported error on opening connection");
        }

        this._connectionState = CONN_CONNECTED;

        return res;
    }

    /**
     * Connects to the server
     */
    async connect() {
        debug('NetDDEClient connect');

        if (this._connectionState != CONN_DISCONNECTED) throw new Error("Already connected or connection in progress");

        this._connectionState = CONN_CONNECTING;

        if (this._transport == 'tcp') {
            this._socket = net.createConnection(this._port, this._host);

            await new Promise((res, rej) => {
                let onErr = e => {
                    this._connectionState = CONN_DISCONNECTED;
                    this._socket.destroy();
                    rej(e);
                };
                this._socket.on('error', onErr)
                this._socket.on('connect', () => {
                    this._socket.removeListener('error', onErr);
                    res();
                });
            });

            try { //failing to set keepalives shouldn't fail the connection
                this._socket.setKeepAlive(true, this._timeout);
                if (netKeepAlive) {
                    netKeepAlive.setKeepAliveInterval(this._socket, this._timeout);
                    netKeepAlive.setKeepAliveProbes(this._socket, 3);
                }
            } catch (e) {}

            this._socket.on('error', e => this._onSocketError(e));
            this._socket.on('close', () => this._onSocketClose());
        }

        return await this._connectNetDDE();
    }

    async disconnect() {
        debug('NetDDEClient disconnect');

        if (this._connectionState == CONN_CONNECTING) throw new Error("Can't handle disconnection while still connecting");
        if (this._connectionState != CONN_CONNECTED) return; // proceed only if connected

        this._connectionState = CONN_DISCONNECTING;

        await this._destroyAllConversations();
        await this._dropConnection();
    }

    get isConnected() {
        return this._connectionState == CONN_CONNECTED;
    }

    /**
     * Requests an item of a topic, in the format specified
     * @param {string} topic 
     * @param {string} item 
     * @param {number} [format]
     * @returns {Promise<*>}
     */
    async request(topic, item, format = C.dataType.CF_TEXT) {
        debug('NetDDEClient request', topic, item);

        if (this._connectionState != CONN_CONNECTED) throw new Error("Not connected");

        let conv = await this._getConversation(topic);
        let res = await this._ep.sendPacket(C.DDE_REQUEST, {
            convPtr: conv.ptr,
            convId: conv.id,
            item: item,
            format: format
        });

        if (!res.result) throw new Error("Server returned error on requesting item");

        return helper.decodeFormat(format, res.data);
    }

    /**
     * Pokes (writes) an item with the data specified
     * @param {string} topic 
     * @param {string} item 
     * @param {number} format 
     * @param {*} data 
     * @returns {Promise<void>}
     */
    async poke(topic, item, format, data) {
        debug('NetDDEClient poke', topic, item, format, data);

        if (this._connectionState != CONN_CONNECTED) throw new Error("Not connected");

        let conv = await this._getConversation(topic);
        let res = await this._ep.sendPacket(C.DDE_POKE, {
            convPtr: conv.ptr,
            convId: conv.id,
            item: item,
            format: format,
            data: helper.encodeFormat(format, data)
        });

        if (!res.result) throw new Error("Server returned error on poking item");
    }

    /**
     * Executes a command on the server at the topic specified
     * @param {string} topic 
     * @param {string} command 
     */
    async execute(topic, command) {
        debug('NetDDEClient execute', topic, command);

        if (this._connectionState != CONN_CONNECTED) throw new Error("Not connected");

        let conv = await this._getConversation(topic);
        let res = await this._ep.sendPacket(C.DDE_EXECUTE, {
            convPtr: conv.ptr,
            convId: conv.id,
            command
        });

        if (!res.result) throw new Error("Server returned error on executing command");
    }

    /**
     * 
     * @param {string} topic 
     * @param {string} item 
     * @param {number} format 
     * @param {boolean} requestValue request the cuurent value when initing this advise
     */
    async advise(topic, item, format, requestValue) {
        debug('NetDDEClient advise', topic, item, format, requestValue);

        if (this._connectionState != CONN_CONNECTED) throw new Error("Not connected");

        let conv = await this._getConversation(topic);
        let res = await this._ep.sendPacket(C.DDE_START_ADVISE, {
            convPtr: conv.ptr,
            convId: conv.id,
            item: item,
            format: format,
            async: false, //makes our life easier handling errors!
            reqVal: requestValue
        });

        if (!res.result) throw new Error("Server returned error on starting advise of item");
    }

    async stopAdvise(topic, item, format) {
        debug('NetDDEClient stopAdvise', topic, item, format);

        if (this._connectionState != CONN_CONNECTED) throw new Error("Not connected");

        let conv = await this._getConversation(topic);
        await this._ep.sendPacket(C.DDE_STOP_ADVISE, {
            convPtr: conv.ptr,
            convId: conv.id,
            item: item,
            format: format
        });
    }

}

module.exports = NetDDEClient;