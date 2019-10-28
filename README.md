# NetDDE

A JavaScript implementation of the NetDDE protocol.

The goal with this package is to be able to exchange data with a Windows computer running the server side of [Chris Oldwood's DDE Network Bridge](https://github.com/chrisoldwood/NetDDE) from a Node.JS program. NetDDE's terminology and limitations apply here.

## Usage

For a detailed API specification please check the generated JSDoc

```js
const { NetDDEClient, Constants } = require('netdde');

let excel = new NetDDEClient('EXCEL', { host: '127.0.0.1' /*, port: 8888 */ });
excel.connect().then(async () => {

    //gets the content of cell A2 on Sheet1
    console.log(await excel.request('Sheet1', 'r2c1'));
    //gets the content of the range A1:C4 on Sheet1
    console.log(await excel.request('Sheet1', 'r1c1:r4c3'));

    //writes 'Hello World!' on cell B42
    console.log(await excel.poke('Sheet2', 'r42c2', Constants.dataType.CF_TEXT, 'Hello World!'));

    //execute a command (simulate it's being typed on the keyboard)
    console.log(await excel.execute('System', "I'm a cell content\r\n"));

    //listen for changes on an item (cell A1)
    await excel.advise('Sheet 1', 'r1c1', Constants.dataType.CF_TEXT);
    excel.on('advise', d => {
        console.log(`Cell on ${d.item} of ${d.topic} changed to ${d.data}`);
    });
    //stop listening to changes on it
    await excel.stopAdvise('Sheet 1', 'r1c1', Constants.dataType.CF_TEXT);

    //this gets emitted when a topic disconnects (sheet is closed, for example)
    excel.on('topic_disconnect', topic => {
        /* Note this will be fired only for existing
           conversations, that is, something has been
           already send over this topic*/
        console.log(`${topic} is not there anymore :(`);
    });

    //get emitted when the connection closes, regardless the reason
    excel.on('close', () => console.log('Bye!'));

    //closes all running conversations and disconnect
    await excel.disconnect();
});
```

## References

 - [Microsoft Docs - About Dynamic Data Exchange](https://docs.microsoft.com/en-us/windows/win32/dataxchg/about-dynamic-data-exchange)
 - [Chris Oldwood's Freeware Win32 Stuff](http://www.chrisoldwood.com/win32.htm)

This node was created by [Smart-Tech](https://netsmarttech.com) as part of the [ST-One](https://netsmarttech.com/page/st-one) project.

Special thanks to Chris Oldwood's work shared to the community!

## License

Copyright: (c) 2019, Smart-Tech, Guilherme Francescon Cittolin <guilherme.francescon@netsmarttech.com>

GNU General Public License v3.0+ (see LICENSE or https://www.gnu.org/licenses/gpl-3.0.txt)