//@ts-check
/*
  Copyright: (c) 2019, Guilherme Francescon Cittolin <gfcittolin@gmail.com>
  GNU General Public License v3.0+ (see LICENSE or https://www.gnu.org/licenses/gpl-3.0.txt)
*/

const { Transform } = require('stream');
const util = require('util');
const debug = util.debuglog('netdde');

const C = require('../constants');
const helper = require('../helper');

class NetDDEClientParser extends Transform {

    constructor(opts) {
        opts = opts || {};
        opts.readableObjectMode = true;
        opts.decodeStrings = true;

        super(opts);

        this._nBuffer = null;
        debug("new NetDDEClientParser");
    }

    /**
     * 
     * @param {Buffer} chunk 
     * @param {string} encoding 
     * @param {Function} cb 
     */
    _transform(chunk, encoding, cb) {
        debug("NetDDEClientParser _transform", chunk);

        let ptr = 0;

        if (this._nBuffer !== null) {
            debug("NetDDEClientParser _transform join-pkt", this._nBuffer, chunk);
            chunk = Buffer.concat([this._nBuffer, chunk]);
            this._nBuffer = null;
        }

        // test for minimum length
        if (chunk.length < 12) {
            debug("NetDDEClientParser _transform skip-small-pkt", chunk.length);
            this._nBuffer = chunk;
            cb();
            return;
        }

        while (ptr < chunk.length) {

            // parse Header
            let hSize = chunk.readUInt32LE(ptr);
            ptr += 4;
            let hType = chunk.readUInt32LE(ptr);
            ptr += 4;
            let hId = chunk.readUInt32LE(ptr);
            ptr += 4;

            debug("NetDDEClientParser _transform header", hSize, hType, hId);

            // check for packet completeness
            if ((hSize + 12) > chunk.length) {
                debug("NetDDEClientParser _transform skip-incomplete-pkt", hSize, chunk.length);
                this._nBuffer = chunk;
                cb();
                return;
            }

            let payload, result, strItem, convPtr, convId, dataLen, data, format, version;

            switch (hType) {
                case C.NETDDE_CLIENT_CONNECT:
                    result = chunk.readUInt8(ptr) != 0;
                    ptr++;
                    version = helper.parseCString(chunk, ptr);
                    ptr = version.ptr;

                    payload = {
                        result,
                        version: version.str
                    }
                    break;

                case C.DDE_CREATE_CONVERSATION:
                    result = chunk.readUInt8(ptr) != 0;
                    ptr++;
                    convPtr = chunk.readUInt32LE(ptr);
                    ptr += 4;
                    convId = chunk.readUInt32LE(ptr);
                    ptr += 4;

                    payload = {
                        result, convPtr, convId
                    }
                    break;

                case C.DDE_REQUEST:
                    result = chunk.readUInt8(ptr) != 0;
                    ptr++;
                    dataLen = chunk.readUInt32LE(ptr);
                    ptr += 4;
                    data = chunk.slice(ptr, ptr + dataLen);
                    ptr += dataLen;

                    payload = {
                        result, data
                    }
                    break;

                case C.DDE_START_ADVISE_FAILED:
                    convPtr = chunk.readUInt32LE(ptr);
                    ptr += 4;
                    strItem = helper.parseCString(chunk, ptr);
                    ptr = strItem.ptr;
                    format = chunk.readUInt32LE(ptr);
                    ptr += 4;
                    // skip fixed true
                    ptr += 1;

                    payload = {
                        convPtr, item: strItem.str, format
                    };
                    break;

                case C.DDE_ADVISE:
                    convPtr = chunk.readUInt32LE(ptr);
                    ptr += 4;
                    strItem = helper.parseCString(chunk, ptr);
                    ptr = strItem.ptr;
                    format = chunk.readUInt32LE(ptr);
                    ptr += 4;
                    dataLen = chunk.readUInt32LE(ptr);
                    ptr += 4;
                    data = chunk.slice(ptr, ptr + dataLen);
                    ptr += dataLen;
                    // skip fixed true
                    ptr += 1;

                    payload = {
                        convPtr, item: strItem.str, format, data
                    };
                    break;

                case C.DDE_DISCONNECT:
                    convPtr = chunk.readUInt32LE(ptr);
                    ptr += 4;

                    payload = {
                        convPtr
                    };
                    break;

                case C.DDE_POKE:
                case C.DDE_EXECUTE:
                case C.DDE_START_ADVISE:
                    result = chunk.readUInt8(ptr) != 0;
                    ptr++;

                    payload = {
                        result
                    }
                    break;

                case C.NETDDE_SERVER_DISCONNECT:
                    payload = {};
                    break;

                default:
                    return cb(new Error(`Unknown telegram type [${hType}] for NetDDEClientParser`));
            }

            this.push({
                type: hType,
                id: hId,
                payload: payload
            });
        }

        cb();
    }
}

debug("create NetDDEClientParser");
module.exports = NetDDEClientParser;