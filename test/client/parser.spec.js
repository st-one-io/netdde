//@ts-check
/*
  Copyright: (c) 2019, Guilherme Francescon Cittolin <gfcittolin@gmail.com>
  GNU General Public License v3.0+ (see LICENSE or https://www.gnu.org/licenses/gpl-3.0.txt)
*/

const { expect } = require('chai');
const { Stream } = require('stream');
const NetDDEClientParser = require('../../src/client/parser');
const C = require('../../src/constants');

describe('NetDDE Client Parser', () => {

    it('should be a stream', () => {
        expect(new NetDDEClientParser()).to.be.instanceOf(Stream);
    });

    it('should create a new instance', () => {
        expect(new NetDDEClientParser).to.be.instanceOf(Stream);
    });

    it('should decode a NETDDE_CLIENT_CONNECT', (done) => {
        let parser = new NetDDEClientParser();
        parser.on('data', (data) => {
            expect(data).to.be.deep.equal({
                id: 1,
                type: C.NETDDE_CLIENT_CONNECT,
                payload: {
                    result: true,
                    version: "v2.0"
                }
            });
            done();
        });

        parser.write(Buffer.from('0a0000001000000001000000010500000076322e3000', 'hex'));
    });

    it('should decode a DDE_CREATE_CONVERSATION', (done) => {
        let parser = new NetDDEClientParser();
        parser.on('data', (data) => {
            expect(data).to.be.deep.equal({
                id: 2,
                type: C.DDE_CREATE_CONVERSATION,
                payload: {
                    result: true,
                    convPtr: 0x02000580,
                    convId: 1
                }
            });
            done();
        });

        parser.write(Buffer.from('090000002000000002000000018005000201000000', 'hex'));
    });

    it('should decode a DDE_POKE', (done) => {
        let parser = new NetDDEClientParser();
        parser.on('data', (data) => {
            expect(data).to.be.deep.equal({
                id: 3,
                type: C.DDE_POKE,
                payload: {
                    result: true
                }
            });
            done();
        });

        parser.write(Buffer.from('01000000260000000300000001', 'hex'));
    });

    it('should decode a DDE_REQUEST', (done) => {
        let parser = new NetDDEClientParser();
        parser.on('data', (data) => {
            expect(data).to.be.deep.equal({
                id: 4,
                type: C.DDE_REQUEST,
                payload: {
                    result: true,
                    data: Buffer.from('bar\r\n\0')
                }
            });
            done();
        });

        parser.write(Buffer.from('0b000000220000000400000001060000006261720d0a00', 'hex'));
    });

    it('should decode a DDE_EXECUTE', (done) => {
        let parser = new NetDDEClientParser();
        parser.on('data', (data) => {
            expect(data).to.be.deep.equal({
                id: 9,
                type: C.DDE_EXECUTE,
                payload: {
                    result: true
                }
            });
            done();
        });

        parser.write(Buffer.from('01000000250000000900000001', 'hex'));
    });

    it('should decode a DDE_START_ADVISE', (done) => {
        let parser = new NetDDEClientParser();
        parser.on('data', (data) => {
            expect(data).to.be.deep.equal({
                id: 14,
                type: C.DDE_START_ADVISE,
                payload: {
                    result: true
                }
            });
            done();
        });

        parser.write(Buffer.from('01000000230000000e00000001', 'hex'));
    });

    it('should decode a DDE_ADVISE', (done) => {
        let parser = new NetDDEClientParser();
        parser.on('data', (data) => {
            expect(data).to.be.deep.equal({
                id: 0xffffffff,
                type: C.DDE_ADVISE,
                payload: {
                    convPtr: 0x05000580,
                    item: "r1c1:r3c2",
                    format: C.dataType.CF_TEXT,
                    data: Buffer.from('foo\tbar\r\n\t\r\nhi\tbaz\r\n\0')
                }
            });
            done();
        });

        parser.write(Buffer.from('3000000032f00000ffffffff800500050a000000723163313a72336332000100000015000000666f6f096261720d0a090d0a68690962617a0d0a0001', 'hex'));
    });

    it('should decode a DDE_DISCONNECT', (done) => {
        let parser = new NetDDEClientParser();
        parser.on('data', (data) => {
            expect(data).to.be.deep.equal({
                id: 0xffffffff,
                type: C.DDE_DISCONNECT,
                payload: {
                    convPtr: 0x05000580
                }
            });
            done();
        });

        parser.write(Buffer.from('0400000031f00000ffffffff80050005', 'hex'));
    });


    it('should decode a splitted packet (on header)', (done) => {
        let parser = new NetDDEClientParser();
        parser.on('data', (data) => {
            expect(data).to.be.deep.equal({
                id: 0xffffffff,
                type: C.DDE_ADVISE,
                payload: {
                    convPtr: 0x05000580,
                    item: "r1c1:r3c2",
                    format: C.dataType.CF_TEXT,
                    data: Buffer.from('foo\tbar\r\n\t\r\nhi\tbaz\r\n\0')
                }
            });
            done();
        });

        //parser.write(Buffer.from('3000000032f00000ffffffff800500050a000000723163313a72336332000100000015000000666f6f096261720d0a090d0a68690962617a0d0a0001', 'hex'));
        parser.write(Buffer.from('3000000032', 'hex'));
        parser.write(Buffer.from('f00000ffffffff800500050a000000723163313a72336332000100000015000000666f6f096261720d0a090d0a68690962617a0d0a0001', 'hex'));
    });

    it('should decode a splitted packet (on payload)', (done) => {
        let parser = new NetDDEClientParser();
        parser.on('data', (data) => {
            expect(data).to.be.deep.equal({
                id: 0xffffffff,
                type: C.DDE_ADVISE,
                payload: {
                    convPtr: 0x05000580,
                    item: "r1c1:r3c2",
                    format: C.dataType.CF_TEXT,
                    data: Buffer.from('foo\tbar\r\n\t\r\nhi\tbaz\r\n\0')
                }
            });
            done();
        });

        //parser.write(Buffer.from('3000000032f00000ffffffff800500050a000000723163313a72336332000100000015000000666f6f096261720d0a090d0a68690962617a0d0a0001', 'hex'));
        parser.write(Buffer.from('3000000032f00000ffffffff800500050a00000072', 'hex'));
        parser.write(Buffer.from('3163313a72336332000100000015000000666f6f096261720d0a090d0a68690962617a0d0a0001', 'hex'));
    });


    it('should decode two consecutive packets', (done) => {
        let parser = new NetDDEClientParser();
        let res = [];
        parser.on('data', (data) => {
            res.push(data);
            if(res.length < 2) return;
            expect(res).to.be.deep.equal([
                {
                    id: 9,
                    type: C.DDE_EXECUTE,
                    payload: {
                        result: true
                    }
                },
                {
                    id: 14,
                    type: C.DDE_START_ADVISE,
                    payload: {
                        result: true
                    }
                }
            ]);
            done();
        });

        parser.write(Buffer.from('01000000250000000900000001' + '01000000230000000e00000001', 'hex'));
    });


    it('should emit an error on an unknown packet type', done => {
        let parser = new NetDDEClientParser();
        parser.on('data', () => done("Data shouldn't be called!"));
        parser.on('error', e => {
            expect(e).to.be.an('error');
            done();
        });

        parser.write(Buffer.from('01000000990000000e00000001', 'hex'));
    });
});