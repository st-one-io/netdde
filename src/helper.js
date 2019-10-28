//@ts-check
/*
  Copyright: (c) 2019, Guilherme Francescon Cittolin <gfcittolin@gmail.com>
  GNU General Public License v3.0+ (see LICENSE or https://www.gnu.org/licenses/gpl-3.0.txt)
*/

const util = require('util');
const debug = util.debuglog('netdde');
const C = require('./constants');

const RGX_nullOnEnd = /\u0000$/;

/**
 * @typedef {Object} CStringRet
 * @property {number} ptr
 * @property {string} str
 */

/**
 * 
 * @param {Buffer} buf 
 * @param {number} ptr 
 * @returns {CStringRet}
 */
function parseCString(buf, ptr){
    debug('parseCString', ptr, buf && buf.length);
    if (buf.length - ptr < 4) throw new Error("Malformed CString - unsufficient bytes for header");

    let strlen = buf.readUInt32LE(ptr);
    ptr += 4;

    if (buf.length - ptr < strlen) throw new Error("Malformed CString - incomplete string");
    let str = buf.toString('utf8', ptr, ptr + strlen - 1);
    ptr += strlen;

    return {str, ptr};
}

/**
 * 
 * @param {Buffer} buf 
 * @param {number} ptr 
 * @param {string} str 
 * @returns {number}
 */
function writeCString(buf, ptr, str = '') {
    debug('writeCString', ptr, buf && buf.length, str);
    if(buf.length < ptr + str.length + 5) throw new Error("Not enough space on Buffer for string");

    str += '\u0000';

    buf.writeUInt32LE(str.length, ptr);
    ptr += 4;
    buf.write(str, ptr, 'utf8');
    ptr += str.length;

    return ptr;
}

/**
 * 
 * @param {number} format 
 * @param {*} data 
 * @returns {Buffer}
 */
function encodeFormat(format, data) {
    debug('encodeFormat', format, data);
    if (data instanceof Buffer) return data;

    switch(format){
        case C.dataType.CF_TEXT:
            return Buffer.from(data.toString() + '\u0000', 'ascii');
        default:
            throw new Error(`Unsupported data format "${format}`);
    }
}

/**
 * 
 * @param {number} format 
 * @param {Buffer} data 
 * @returns {*}
 */
function decodeFormat(format, data) {
    debug('decodeFormat', format, data);

    switch(format) {
        case C.dataType.CF_TEXT:
            return data.toString('ascii').replace(RGX_nullOnEnd, '');
        case C.dataType.CF_UNICODETEXT:
            return data.toString('utf8').replace(RGX_nullOnEnd, '');
        default:
            return data;
    }
}

module.exports = {
    parseCString, writeCString, encodeFormat, decodeFormat
}