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

class NetDDEClientSerializer extends Transform {

    constructor(opts) {
        opts = opts || {};
        opts.writableObjectMode = true;

        super(opts);

        this._nBuffer = null;
        debug("new NetDDEClientSerializer");
    }

    _transform(chunk, encoding, cb) {
        debug("NetDDEClientSerializer _transform");

        this.serialize(chunk, (err, data) => {
            if (err) {
                cb(err);
            } else {
                this.push(data);
                cb();
            }
        });
    }

    serialize(chunk, cb) {
        debug("NetDDEClientSerializer serialize", chunk);

        let buf, bufLen, ptr = 12;

        if (!chunk.id) {
            cb(new Error('Missing packet ID'));
            return;
        }

        if (!chunk.payload) {
            cb(new Error('Missing packet payload'));
            return;
        }

        let strService, strTopic, strItem, strComputer, strUser, strProcess, 
            strVersion, strCmd, convPtr, convId, format, data, bAsync, bReqVal;

        switch(chunk.type){
            case C.NETDDE_CLIENT_CONNECT:
                strService = chunk.payload.service || '';
                strComputer = chunk.payload.computer || '';
                strUser = chunk.payload.user || '';
                strProcess = chunk.payload.process || '';
                strVersion = chunk.payload.version || '';
                
                bufLen = 2 + (5 * 5) + strService.length + strComputer.length + strUser.length + strProcess.length + strVersion.length;
                buf = Buffer.alloc(12 + bufLen);

                buf.writeUInt16LE(C.NETDDE_PROTOCOL, ptr);
                ptr += 2;
                ptr = helper.writeCString(buf, ptr, strService);
                ptr = helper.writeCString(buf, ptr, strComputer);
                ptr = helper.writeCString(buf, ptr, strUser);
                ptr = helper.writeCString(buf, ptr, strProcess);
                ptr = helper.writeCString(buf, ptr, strVersion);
                break;

            case C.NETDDE_CLIENT_DISCONNECT:
                strService = chunk.payload.service || '';
                strComputer = chunk.payload.computer || '';

                bufLen = (2 * 5) + strService.length + strComputer.length;
                buf = Buffer.alloc(12 + bufLen);

                ptr = helper.writeCString(buf, ptr, strService);
                ptr = helper.writeCString(buf, ptr, strComputer);
                break;

            case C.DDE_CREATE_CONVERSATION:
                strService = chunk.payload.service || '';
                strTopic = chunk.payload.topic || '';

                bufLen = (2 * 5) + strService.length + strTopic.length;
                buf = Buffer.alloc(12 + bufLen);

                ptr = helper.writeCString(buf, ptr, strService);
                ptr = helper.writeCString(buf, ptr, strTopic);
                break;

            case C.DDE_DESTROY_CONVERSATION:
                convPtr = chunk.payload.convPtr;
                convId = chunk.payload.convId;

                bufLen = 8;
                buf = Buffer.alloc(12 + bufLen);

                buf.writeUInt32LE(convPtr, ptr);
                ptr += 4;
                buf.writeUInt32LE(convId, ptr);
                ptr += 4;
                break;

            case C.DDE_STOP_ADVISE:
            case C.DDE_REQUEST:
                convPtr = chunk.payload.convPtr;
                convId = chunk.payload.convId;
                strItem = chunk.payload.item || '';
                format = chunk.payload.format || C.dataType.CF_TEXT;

                bufLen = 4 + 4 + 5 + strItem.length + 4;
                buf = Buffer.alloc(12 + bufLen);

                buf.writeUInt32LE(convPtr, ptr);
                ptr += 4;
                buf.writeUInt32LE(convId, ptr);
                ptr += 4;
                ptr = helper.writeCString(buf, ptr, strItem);
                buf.writeUInt32LE(format, ptr);
                ptr += 4;
                break;

            case C.DDE_POKE:
                convPtr = chunk.payload.convPtr;
                convId = chunk.payload.convId;
                strItem = chunk.payload.item || '';
                format = chunk.payload.format || C.dataType.CF_TEXT;
                data = chunk.payload.data;

                bufLen = 4 + 4 + 5 + strItem.length + 4 + 4 + data.length;
                buf = Buffer.alloc(12 + bufLen);

                buf.writeUInt32LE(convPtr, ptr);
                ptr += 4;
                buf.writeUInt32LE(convId, ptr);
                ptr += 4;
                ptr = helper.writeCString(buf, ptr, strItem);
                buf.writeUInt32LE(format, ptr);
                ptr += 4;
                buf.writeUInt32LE(data.length, ptr);
                ptr += 4;
                data.copy(buf, ptr);
                ptr += data.length;
                break;

            case C.DDE_EXECUTE:
                convPtr = chunk.payload.convPtr;
                convId = chunk.payload.convId;
                strCmd = chunk.payload.command || '';

                bufLen = 4 + 4 + 5 + strCmd.length;
                buf = Buffer.alloc(12 + bufLen);

                buf.writeUInt32LE(convPtr, ptr);
                ptr += 4;
                buf.writeUInt32LE(convId, ptr);
                ptr += 4;
                ptr = helper.writeCString(buf, ptr, strCmd);
                break;

            case C.DDE_START_ADVISE:
                convPtr = chunk.payload.convPtr;
                convId = chunk.payload.convId;
                strItem = chunk.payload.item || '';
                format = chunk.payload.format || C.dataType.CF_TEXT;
                bAsync = chunk.payload.async
                bReqVal = chunk.payload.reqVal

                bufLen = 4 + 4 + (5 + strItem.length) + 4 + 1 + 1;
                buf = Buffer.alloc(12 + bufLen);

                buf.writeUInt32LE(convPtr, ptr);
                ptr += 4;
                buf.writeUInt32LE(convId, ptr);
                ptr += 4;
                ptr = helper.writeCString(buf, ptr, strItem);
                buf.writeUInt32LE(format, ptr);
                ptr += 4;
                buf.writeUInt8(bAsync ? 1 : 0, ptr);
                ptr += 1;
                buf.writeUInt8(bReqVal ? 1 : 0, ptr);
                ptr += 1;
                break;

            default:
                cb(new Error('Unknown or missing packet type'));
                return;
        }

        // write header
        buf.writeUInt32LE(bufLen, 0);
        buf.writeUInt32LE(chunk.type, 4);
        buf.writeUInt32LE(chunk.id, 8);

        debug("NetDDEClientSerializer serialize result", buf);
        cb(null, buf);
    }
}
debug("create NetDDEClientSerializer");
module.exports = NetDDEClientSerializer;