//@ts-check
/*
  Copyright: (c) 2019, Guilherme Francescon Cittolin <gfcittolin@gmail.com>
  GNU General Public License v3.0+ (see LICENSE or https://www.gnu.org/licenses/gpl-3.0.txt)
*/

const { expect } = require('chai');
const { Stream } = require('stream');
const NetDDEClientSerializer = require('../../src/client/serializer');
const C = require('../../src/constants');

describe('NetDDE Client Serializer', () => {

    it('should be a stream', () => {
        expect(new NetDDEClientSerializer()).to.be.instanceOf(Stream);
    });

    it('should create a new instance', () => {
        expect(new NetDDEClientSerializer).to.be.instanceOf(Stream);
    });

    it('should encode a NETDDE_CLIENT_CONNECT', (done) => {
        let serializer = new NetDDEClientSerializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('470000001000000001000000020006000000455843454c000b000000726f616472756e6e6572000a0000006775696c6865726d6500110000004e6574444445436c69656e742e657865000500000076322e3000');
            done();
        });

        serializer.write({ 
            id: 1,
            type: C.NETDDE_CLIENT_CONNECT,
            payload: {
                service: "EXCEL",
                computer: "roadrunner",
                user: "guilherme",
                process: "NetDDEClient.exe",
                version: "v2.0"
            }
        });
    });

    it('should encode a DDE_CREATE_CONVERSATION', (done) => {
        let serializer = new NetDDEClientSerializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('21000000200000000200000006000000455843454c00130000005b426f6f6b312e786c73785d53686565743100');
            done();
        });

        serializer.write({ 
            id: 2,
            type: C.DDE_CREATE_CONVERSATION,
            payload: {
                service: "EXCEL",
                topic: "[Book1.xlsx]Sheet1"
            }
        });
    });

    it('should encode a DDE_POKE', (done) => {
        let serializer = new NetDDEClientSerializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('1d000000260000000300000080050002010000000500000072316331000100000004000000666f6f00');
            done();
        });

        serializer.write({ 
            id: 3,
            type: C.DDE_POKE,
            payload: {
                convPtr: 0x02000580,
                convId: 1,
                item: "r1c1",
                //format: C.dataType.CF_TEXT, //defaults to CF_TEXT
                data: Buffer.from('foo\u0000', 'ascii')
            }
        });
    });

    it('should encode a DDE_REQUEST', (done) => {
        let serializer = new NetDDEClientSerializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('150000002200000004000000800500020100000005000000723163320001000000');
            done();
        });

        serializer.write({ 
            id: 4,
            type: C.DDE_REQUEST,
            payload: {
                convPtr: 0x02000580,
                convId: 1,
                item: "r1c2",
                //format: C.dataType.CF_TEXT, //defaults to CF_TEXT
            }
        });
    });

    it('should encode a DDE_DESTROY_CONVERSATION', (done) => {
        let serializer = new NetDDEClientSerializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('0800000021000000050000008005000201000000');
            done();
        });

        serializer.write({ 
            id: 5,
            type: C.DDE_DESTROY_CONVERSATION,
            payload: {
                convPtr: 0x02000580,
                convId: 1
            }
        });
    });

    it('should encode a NETDDE_CLIENT_DISCONNECT', (done) => {
        let serializer = new NetDDEClientSerializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('19000000110000000600000006000000455843454c000b000000726f616472756e6e657200');
            done();
        });

        serializer.write({ 
            id: 6,
            type: C.NETDDE_CLIENT_DISCONNECT,
            payload: {
                service: "EXCEL",
                computer: "roadrunner"
            }
        });
    });

    it('should encode a DDE_EXECUTE', (done) => {
        let serializer = new NetDDEClientSerializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('10000000250000000900000080050004020000000400000062617a00');
            done();
        });

        serializer.write({
            id: 9,
            type: C.DDE_EXECUTE,
            payload: {
                convPtr: 0x04000580,
                convId: 2,
                command: "baz"
            }
        });
    });

    it('should encode a DDE_START_ADVISE', (done) => {
        let serializer = new NetDDEClientSerializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('1c000000230000000e00000080050005030000000a000000723163313a7233633200010000000000');
            done();
        });

        serializer.write({
            id: 14,
            type: C.DDE_START_ADVISE,
            payload: {
                convPtr: 0x05000580,
                convId: 3,
                command: "baz",
                item: "r1c1:r3c2",
                format: C.dataType.CF_TEXT, //defaults to CF_TEXT
                async: false,
                reqVal: false
            }
        });
    });

    it('should encode a DDE_START_ADVISE (with defaults)', (done) => {
        let serializer = new NetDDEClientSerializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('1c000000230000000e00000080050005030000000a000000723163313a7233633200010000000000');
            done();
        });

        serializer.write({
            id: 14,
            type: C.DDE_START_ADVISE,
            payload: {
                convPtr: 0x05000580,
                convId: 3,
                command: "baz",
                item: "r1c1:r3c2",
                //format: C.dataType.CF_TEXT, //defaults to CF_TEXT
                //async: false,
                //reqVal: false
            }
        });
    });

    it('should encode a DDE_STOP_ADVISE', (done) => {
        let serializer = new NetDDEClientSerializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('1a000000240000000f00000080050005030000000a000000723163313a723363320001000000');
            done();
        });

        serializer.write({
            id: 15,
            type: C.DDE_STOP_ADVISE,
            payload: {
                convPtr: 0x05000580,
                convId: 3,
                command: "baz",
                item: "r1c1:r3c2",
                //format: C.dataType.CF_TEXT, //defaults to CF_TEXT
            }
        });
    });

    it('should emit an error on the absence of the packet ID', done => {
        let serializer = new NetDDEClientSerializer();
        serializer.on('data', () => done("Data shouldn't be called!"));
        serializer.on('error', e => {
            expect(e).to.be.an('error');
            done();
        })

        serializer.write({
            //id: 9,
            type: C.DDE_EXECUTE,
            payload: {
                convPtr: 0x04000580,
                convId: 2,
                command: "baz"
            }
        });
    });

    it('should emit an error on the absence of the payload', done => {
        let serializer = new NetDDEClientSerializer();
        serializer.on('data', () => done("Data shouldn't be called!"));
        serializer.on('error', e => {
            expect(e).to.be.an('error');
            done();
        })

        serializer.write({
            id: 9,
            type: C.DDE_EXECUTE,
            /*payload: {
                convPtr: 0x04000580,
                convId: 2,
                command: "baz"
            }*/
        });
    });

    it('should emit an error on the absence of the type', done => {
        let serializer = new NetDDEClientSerializer();
        serializer.on('data', () => done("Data shouldn't be called!"));
        serializer.on('error', e => {
            expect(e).to.be.an('error');
            done();
        })

        serializer.write({
            id: 9,
            //type: C.DDE_EXECUTE,
            payload: {
                convPtr: 0x04000580,
                convId: 2,
                command: "baz"
            }
        });
    });
});