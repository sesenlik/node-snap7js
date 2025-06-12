const { S7Client, S7Consts } = require('../lib/snap7js');

async function readExample() {
    const client = new S7Client();

    try {
        // Connect to PLC (adjust IP, rack, slot as needed)
        console.log('Connecting to PLC...');
        await client.ConnectTo('192.168.0.1', 0, 1);
        console.log('Connected successfully!');

        // ===========================================
        // Example 1: Reading a single bit (boolean)
        // ===========================================
        console.log('\nReading a single bit from M0.0 (Merker memory)');

        const bitBuffer = Buffer.alloc(1);
        const bitResult = await client.ReadArea(
            S7Consts.S7AreaMK,  // Memory area (Merker)
            0,                  // DB number (0 for Merker)
            0,                  // Start address (byte 0, bit 0)
            1,                  // Amount (1 bit)
            S7Consts.S7WLBit,   // Data type: Bit
            bitBuffer           // Buffer to store result
        );

        console.log('Read result:', S7Client.ErrorText(bitResult.LastError));
        console.log(`Value: ${bitBuffer[0] > 0 ? 'TRUE' : 'FALSE'}`);
        console.log(`Bits read: ${bitResult.BytesRead * 8}`);

        // ===========================================
        // Example 2: Reading multiple bytes from a DB
        // ===========================================
        console.log('\nReading 10 bytes from DB1 starting at byte offset 0');

        const bytesBuffer = Buffer.alloc(10);
        const bytesResult = await client.ReadArea(
            S7Consts.S7AreaDB,  // Data Block area
            1,                  // DB number (1)
            0,                  // Start address (byte 0)
            10,                 // Amount (10 bytes)
            S7Consts.S7WLByte,  // Data type: Byte
            bytesBuffer         // Buffer to store result
        );

        console.log('Read result:', S7Client.ErrorText(bytesResult.LastError));
        console.log('Data:', bytesBuffer);
        console.log(`Bytes read: ${bytesResult.BytesRead}`);

        // ===========================================
        // Example 3: Reading a REAL (float) value
        // ===========================================
        console.log('\nReading a REAL value from DB1.DBD20 (4 bytes)');

        const floatBuffer = Buffer.alloc(4);
        const floatResult = await client.ReadArea(
            S7Consts.S7AreaDB,  // Data Block area
            1,                  // DB number (1)
            20,                 // Start address (byte 20)
            1,                  // Amount (1 REAL = 4 bytes)
            S7Consts.S7WLReal,  // Data type: Real
            floatBuffer         // Buffer to store result
        );

        const floatValue = floatBuffer.readFloatBE(0);
        console.log('Read result:', S7Client.ErrorText(floatResult.LastError));
        console.log(`REAL value: ${floatValue}`);
        console.log(`REAL values read: ${floatResult.BytesRead / 4}`);

        // ===========================================
        // Example 4: Reading a WORD (16-bit unsigned)
        // ===========================================
        console.log('\nReading a WORD from DB1.DBW30 (2 bytes)');

        const wordBuffer = Buffer.alloc(2);
        const wordResult = await client.ReadArea(
            S7Consts.S7AreaDB,  // Data Block area
            1,                  // DB number (1)
            30,                 // Start address (byte 30)
            1,                  // Amount (1 WORD = 2 bytes)
            S7Consts.S7WLWord,  // Data type: Word
            wordBuffer          // Buffer to store result
        );

        const wordValue = wordBuffer.readUInt16BE(0);
        console.log('Read result:', S7Client.ErrorText(wordResult.LastError));
        console.log(`WORD value: ${wordValue} (0x${wordValue.toString(16).toUpperCase()})`);
        console.log(`WORDs read: ${wordResult.BytesRead / 2}`);

        // ===========================================
        // Example 5: Reading a DWORD (32-bit unsigned)
        // ===========================================
        console.log('\nReading a DWORD from DB1.DBD32 (4 bytes)');

        const dwordBuffer = Buffer.alloc(4);
        const dwordResult = await client.ReadArea(
            S7Consts.S7AreaDB,   // Data Block area
            1,                   // DB number (1)
            32,                  // Start address (byte 32)
            1,                   // Amount (1 DWORD = 4 bytes)
            S7Consts.S7WLDWord,  // Data type: DWord
            dwordBuffer          // Buffer to store result
        );

        const dwordValue = dwordBuffer.readUInt32BE(0);
        console.log('Read result:', S7Client.ErrorText(dwordResult.LastError));
        console.log(`DWORD value: ${dwordValue} (0x${dwordValue.toString(16).toUpperCase()})`);
        console.log(`DWORDs read: ${dwordResult.BytesRead / 4}`);

        // ===========================================
        // Example 6: Reading a timer value
        // ===========================================
        console.log('\nReading a timer value from T5');

        const timerBuffer = Buffer.alloc(2);
        const timerResult = await client.ReadArea(
            S7Consts.S7AreaTM,  // Timer area
            0,                  // No DB number for timers
            5,                  // Timer number (5)
            1,                  // Amount (1 timer)
            S7Consts.S7WLTimer, // Data type: Timer
            timerBuffer         // Buffer to store result
        );

        const timerValue = timerBuffer.readUInt16BE(0);
        console.log('Read result:', S7Client.ErrorText(timerResult.LastError));
        console.log(`Timer value: ${timerValue}ms`);
        console.log(`Timers read: ${timerResult.BytesRead / 2}`);

    } catch (error) {
        console.error('Error:', error);
        console.error('Detailed error:', S7Client.ErrorText(client._LastError));
    } finally {
        client.Disconnect();
        console.log('Disconnected from PLC');
    }
}

readExample();