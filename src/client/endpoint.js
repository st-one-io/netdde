//@ts-check
/*
  Copyright: (c) 2019, Guilherme Francescon Cittolin <gfcittolin@gmail.com>
  GNU General Public License v3.0+ (see LICENSE or https://www.gnu.org/licenses/gpl-3.0.txt)
*/

const { Duplex } = require('stream');
const { EventEmitter } = require('events');
const util = require('util');
const debug = util.debuglog('netdde');

const NetDDEClientParser = require('./parser');
const NetDDEClientSerializer = require('./serializer');

const C = require('../constants');
const helper = require('../helper');

class NetDDEClientEndpoint extends EventEmitter {

    /**
     * 
     * @param {Duplex} socket 
     * @param {object} [opts]
     * @param {number} [opts.timeout]
     */
    constructor(socket, opts) {
        super();

        if (!socket) {
            throw new Error("A socket for reading/writing data is expected");
        }

        this._s = socket;
        this._timeout = isNaN(opts.timeout) ? 10000 : opts.timeout;
        this._pktId = 0;
        this._pktQueue = new Map();
        this._serializer = new NetDDEClientSerializer();
        this._parser = new NetDDEClientParser();

        this._serializer.on('error', e => this.emit('error', e));
        this._parser.on('error', e => this.emit('error', e));

        // connect streams
        this._s.pipe(this._parser);
        this._serializer.pipe(this._s);
        this._parser.on('data', d => this._onParserData(d));

        debug('new NetDDEClientEndpoint');
    }

    _nextPktId() {
        this._pktId++;
        if (this._pktId > 0xffff) {
            this._pktId = 1;
        }

        debug('NetDDEClientEndpoint _nextPktId', this._pktId);
        return this._pktId;
    }

    _onParserData(pkt) {
        debug('NetDDEClientEndpoint _onParserData', pkt);
        
        let id = pkt.id;

        if (id == 0xffffffff) {
            // async packet

            let evt;
            switch(pkt.type){
                case C.NETDDE_SERVER_DISCONNECT: evt = 'dde_server_disconnect'; break;
                case C.DDE_DISCONNECT: evt = 'dde_disconnect'; break;
                case C.DDE_ADVISE: evt = 'dde_advise'; break;
                case C.DDE_START_ADVISE_FAILED: evt = 'dde_advise_start_failed'; break;
                default:
                    this.emit('error', new Error(`Unknown async packet type [${pkt.type}] received`));
                    return;
            }

            this.emit(evt, pkt.payload);

        } else {
            // sync packet

            let pktPromise = this._pktQueue.get(id);
            if(!pktPromise){
                this.emit('error', new Error(`Unknown packet id [${id}] received`));
                return;
            }
            
            this._pktQueue.delete(id);
            clearTimeout(pktPromise.timeout);
            
            //TODO maybe validate response packet's type to match the one we've sent

            pktPromise.res(pkt.payload);
        }
    }

    _onTimeout(id) {
        debug('NetDDEClientEndpoint _onTimeout', id);
        
        let pktPromise = this._pktQueue.get(id);
        this._pktQueue.delete(id);

        pktPromise.rej(new Error(`Timeout waiting for answer of request type [${pktPromise}]`));
    }

    destroy() {
        debug('NetDDEClientEndpoint destroy');

        for (const pktPromise of this._pktQueue.values()){
            clearTimeout(pktPromise.timeout);
            process.nextTick(() => pktPromise.rej(new Error('Process interrupted')));
        }

        this._pktQueue.clear();
    }

    /**
     * 
     * @param {number} type 
     * @param {object} payload 
     * @returns {Promise}
     */
    sendPacket(type, payload) {
        debug('NetDDEClientEndpoint sendPacket', type, payload);

        return new Promise((res, rej) => {
            let id = this._nextPktId();
            let pkt = { id, type, payload };

            if (type == C.NETDDE_CLIENT_DISCONNECT 
                || type == C.DDE_DESTROY_CONVERSATION
                || type == C.DDE_STOP_ADVISE) {
                // we don't have a response packet for these, so just resolve after writing
                
                this._serializer.write(pkt, err => err ? rej(err) : res());
            } else {
                this._serializer.write(pkt);
                let timeout = this._timeout ? setTimeout(id => this._onTimeout(id), this._timeout, id) : null;
                let pktPromise = { res, rej, timeout };
                this._pktQueue.set(id, pktPromise);
            }

        });

    }

}

module.exports = NetDDEClientEndpoint;