const { S7Client, S7Consts } = require('../lib/snap7js');

async function writeExample() {
    const client = new S7Client();

    try {
        // Connect to PLC (adjust IP, rack, slot as needed)
        console.log('Connecting to PLC...');
        await client.ConnectTo('192.168.0.1', 0, 1);
        console.log('Connected successfully!');

        // ===========================================
        // Example 1: Writing a single bit (boolean)
        // ===========================================
        console.log('\nWriting a single bit to M0.0 (Merker memory)');

        // Create a buffer with the value to write (1 = true, 0 = false)
        const bitValue = Buffer.alloc(1);
        bitValue[0] = 1; // Set to true

        const bitResult = await client.WriteArea(
            S7Consts.S7AreaMK,      // Memory area (Merker)
            0,                      // DB number (0 for Merker)
            0,                      // Start address (byte 0, bit 0)
            1,                      // Amount (1 bit)
            S7Consts.S7WLBit,       // Data type: Bit
            bitValue                // Data to write
        );

        console.log('Write result:', S7Client.ErrorText(bitResult.LastError));
        console.log(`Bits written: ${bitResult.BytesWritten * 8}`);

        // ===========================================
        // Example 2: Writing multiple bytes to a DB
        // ===========================================
        console.log('\nWriting 4 bytes to DB1 starting at byte offset 10');

        // Create a buffer with values to write
        const bytesToWrite = Buffer.alloc(4);
        bytesToWrite[0] = 0x11;     // First byte
        bytesToWrite[1] = 0x22;     // Second byte
        bytesToWrite[2] = 0x33;     // Third byte
        bytesToWrite[3] = 0x44;     // Fourth byte

        const bytesResult = await client.WriteArea(
            S7Consts.S7AreaDB,      // Data Block area
            1,                      // DB number (1)
            10,                     // Start address (byte 10)
            4,                      // Amount (4 bytes)
            S7Consts.S7WLByte,      // Data type: Byte
            bytesToWrite            // Data to write
        );

        console.log('Write result:', S7Client.ErrorText(bytesResult.LastError));
        console.log(`Bytes written: ${bytesResult.BytesWritten}`);

        // ===========================================
        // Example 3: Writing a REAL (float) value
        // ===========================================
        console.log('\nWriting a REAL value to DB1.DBD20 (4 bytes)');

        const floatValue = Buffer.alloc(4);
        floatValue.writeFloatBE(123.456, 0); // Write float to buffer

        const floatResult = await client.WriteArea(
            S7Consts.S7AreaDB,      // Data Block area
            1,                      // DB number (1)
            20,                     // Start address (byte 20)
            1,                      // Amount (1 REAL = 4 bytes)
            S7Consts.S7WLReal,      // Data type: Real
            floatValue              // Data to write
        );

        console.log('Write result:', S7Client.ErrorText(floatResult.LastError));
        console.log(`REAL values written: ${floatResult.BytesWritten / 4}`);

    } catch (error) {
        console.error('Error:', error);
        console.error('Detailed error:', S7Client.ErrorText(client._LastError));
    } finally {
        client.Disconnect();
        console.log('Disconnected from PLC');
    }
}

writeExample();