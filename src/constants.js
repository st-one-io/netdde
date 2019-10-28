//@ts-check
/*
  Copyright: (c) 2019, Guilherme Francescon Cittolin <gfcittolin@gmail.com>
  GNU General Public License v3.0+ (see LICENSE or https://www.gnu.org/licenses/gpl-3.0.txt)
*/

const PACKET_SYNC_MASK = 0xF000;
const PACKET_TYPE_MASK = 0x0FFF;

// Packet handling type.
const SYNC_PACKET = 0x0000;
const ASYNC_PACKET = 0xF000;

// Client -> Server internal packets.
const NETDDE_CLIENT_CONNECT = (SYNC_PACKET | 0x0010);
const NETDDE_CLIENT_DISCONNECT = (SYNC_PACKET | 0x0011);

// Client -> Server DDE request packets.
const DDE_CREATE_CONVERSATION = (SYNC_PACKET | 0x0020);
const DDE_DESTROY_CONVERSATION = (SYNC_PACKET | 0x0021);
const DDE_REQUEST = (SYNC_PACKET | 0x0022);
const DDE_EXECUTE = (SYNC_PACKET | 0x0025);
const DDE_POKE = (SYNC_PACKET | 0x0026);
const DDE_START_ADVISE = (SYNC_PACKET | 0x0023);
const DDE_STOP_ADVISE = (SYNC_PACKET | 0x0024);

// Server -> Client DDE notification packets.
const NETDDE_SERVER_DISCONNECT = (ASYNC_PACKET | 0x0030);
const DDE_DISCONNECT = (ASYNC_PACKET | 0x0031);
const DDE_ADVISE = (ASYNC_PACKET | 0x0032);
const DDE_START_ADVISE_FAILED = (ASYNC_PACKET | 0x0033);

const NETDDE_PROTOCOL = 2;

const dataType = Object.freeze({
    CF_TEXT: 1,
    CF_BITMAP: 2,
    CF_METAFILEPICT: 3,
    CF_SYLK: 4,
    CF_DIF: 5,
    CF_TIFF: 6,
    CF_OEMTEXT: 7,
    CF_DIB: 8,
    CF_PALETTE: 9,
    CF_PENDATA: 10,
    CF_RIFF: 11,
    CF_WAVE: 12,
    CF_UNICODETEXT: 13,
    CF_ENHMETAFILE: 14,
    CF_HDROP: 15,
    CF_LOCALE: 16,
    CF_DIBV5: 17,
    CF_OWNERDISPLAY: 0x0080,
    CF_DSPTEXT: 0x0081,
    CF_DSPBITMAP: 0x0082,
    CF_DSPMETAFILEPICT: 0x0083,
    CF_DSPENHMETAFILE: 0x008E,
    CF_PRIVATEFIRST: 0x0200,
    CF_PRIVATELAST: 0x02FF,
    CF_GDIOBJFIRST: 0x0300,
    CF_GDIOBJLAST: 0x03FF,
});
const dataTypeNames = Object.keys(dataType);
const dataTypeValues = dataTypeNames.map(k => dataType[k]);

module.exports = Object.freeze({
    dataType, dataTypeNames, dataTypeValues,
    NETDDE_PROTOCOL,

    PACKET_SYNC_MASK,
    PACKET_TYPE_MASK,
    SYNC_PACKET,
    ASYNC_PACKET,

    NETDDE_CLIENT_CONNECT,
    NETDDE_CLIENT_DISCONNECT,
    NETDDE_SERVER_DISCONNECT,
    DDE_CREATE_CONVERSATION,
    DDE_DESTROY_CONVERSATION,
    DDE_REQUEST,
    DDE_START_ADVISE,
    DDE_STOP_ADVISE,
    DDE_EXECUTE,
    DDE_POKE,
    DDE_DISCONNECT,
    DDE_ADVISE,
    DDE_START_ADVISE_FAILED
})