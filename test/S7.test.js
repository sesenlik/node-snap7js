const { assert } = require('chai'); // Instead of Node's assert
const { S7 } = require('../lib/snap7js');

describe('S7 Buffer Helper Tests', () => {
    let buffer;

    beforeEach(() => {
        // Create a fresh buffer for each test
        buffer = Buffer.alloc(16);
        buffer.fill(0); // Clear the buffer
    });

    describe('Bit Operations', () => {
        it('GetBitAt should return correct bit value', () => {
            buffer[0] = 0b00000101; // Binary 00000101 (5 in decimal)

            assert.strictEqual(S7.GetBitAt(buffer, 0, 0), true);
            assert.strictEqual(S7.GetBitAt(buffer, 0, 1), false);
            assert.strictEqual(S7.GetBitAt(buffer, 0, 2), true);
            assert.strictEqual(S7.GetBitAt(buffer, 0, 7), false);

            // Test bounds
            assert.strictEqual(S7.GetBitAt(buffer, 0, -1), false); // Should clamp to 0
            assert.strictEqual(S7.GetBitAt(buffer, 0, 8), false); // Should clamp to 7
        });

        it('SetBitAt should set correct bit value', () => {
            S7.SetBitAt(buffer, 0, 0, true);
            assert.strictEqual(buffer[0], 0b00000001);

            S7.SetBitAt(buffer, 0, 1, true);
            assert.strictEqual(buffer[0], 0b00000011);

            S7.SetBitAt(buffer, 0, 0, false);
            assert.strictEqual(buffer[0], 0b00000010);

            // Test bounds
            S7.SetBitAt(buffer, 0, -1, true); // Should clamp to 0
            assert.strictEqual(buffer[0], 0b00000011);

            S7.SetBitAt(buffer, 0, 8, true); // Should clamp to 7
            assert.strictEqual(buffer[0], 0b10000011);
        });
    });

    describe('Signed Integers', () => {
        it('GetSIntAt should return correct signed 8-bit value', () => {
            buffer[0] = 127;
            assert.strictEqual(S7.GetSIntAt(buffer, 0), 127);

            buffer[0] = 128; // -128 in SINT
            assert.strictEqual(S7.GetSIntAt(buffer, 0), -128);

            buffer[0] = 255; // -1 in SINT
            assert.strictEqual(S7.GetSIntAt(buffer, 0), -1);
        });

        it('SetSIntAt should set correct signed 8-bit value', () => {
            S7.SetSIntAt(buffer, 0, 127);
            assert.strictEqual(buffer[0], 127);

            S7.SetSIntAt(buffer, 0, -128);
            assert.strictEqual(buffer[0], 128);

            S7.SetSIntAt(buffer, 0, -1);
            assert.strictEqual(buffer[0], 255);

            // Test bounds
            S7.SetSIntAt(buffer, 0, 200); // Should clamp to 127
            assert.strictEqual(buffer[0], 127);

            S7.SetSIntAt(buffer, 0, -200); // Should clamp to -128
            assert.strictEqual(buffer[0], 128);
        });

        it('GetIntAt should return correct signed 16-bit value', () => {
            buffer.writeInt16BE(32767, 0);
            assert.strictEqual(S7.GetIntAt(buffer, 0), 32767);

            buffer.writeInt16BE(-32768, 0);
            assert.strictEqual(S7.GetIntAt(buffer, 0), -32768);
        });

        it('SetIntAt should set correct signed 16-bit value', () => {
            S7.SetIntAt(buffer, 0, 32767);
            assert.strictEqual(buffer.readInt16BE(0), 32767);

            S7.SetIntAt(buffer, 0, -32768);
            assert.strictEqual(buffer.readInt16BE(0), -32768);
        });

        it('GetDIntAt should return correct signed 32-bit value', () => {
            buffer.writeInt32BE(2147483647, 0);
            assert.strictEqual(S7.GetDIntAt(buffer, 0), 2147483647);

            buffer.writeInt32BE(-2147483648, 0);
            assert.strictEqual(S7.GetDIntAt(buffer, 0), -2147483648);
        });

        it('SetDIntAt should set correct signed 32-bit value', () => {
            S7.SetDIntAt(buffer, 0, 2147483647);
            assert.strictEqual(buffer.readInt32BE(0), 2147483647);

            S7.SetDIntAt(buffer, 0, -2147483648);
            assert.strictEqual(buffer.readInt32BE(0), -2147483648);
        });

        it('GetLIntAt should return correct signed 64-bit value', () => {
            buffer.writeBigInt64BE(9223372036854775807n, 0);
            assert.strictEqual(S7.GetLIntAt(buffer, 0), 9223372036854775807n);

            buffer.writeBigInt64BE(-9223372036854775808n, 0);
            assert.strictEqual(S7.GetLIntAt(buffer, 0), -9223372036854775808n);
        });

        it('SetLIntAt should set correct signed 64-bit value', () => {
            S7.SetLIntAt(buffer, 0, 9223372036854775807n);
            assert.strictEqual(buffer.readBigInt64BE(0), 9223372036854775807n);

            S7.SetLIntAt(buffer, 0, -9223372036854775808n);
            assert.strictEqual(buffer.readBigInt64BE(0), -9223372036854775808n);
        });
    });

    describe('Unsigned Integers', () => {
        it('GetUSIntAt should return correct unsigned 8-bit value', () => {
            buffer[0] = 255;
            assert.strictEqual(S7.GetUSIntAt(buffer, 0), 255);
        });

        it('SetUSIntAt should set correct unsigned 8-bit value', () => {
            S7.SetUSIntAt(buffer, 0, 255);
            assert.strictEqual(buffer[0], 255);
        });

        it('GetUIntAt/GetWordAt should return correct unsigned 16-bit value', () => {
            buffer.writeUInt16BE(65535, 0);
            assert.strictEqual(S7.GetUIntAt(buffer, 0), 65535);
            assert.strictEqual(S7.GetWordAt(buffer, 0), 65535);
        });

        it('SetUIntAt/SetWordAt should set correct unsigned 16-bit value', () => {
            S7.SetUIntAt(buffer, 0, 65535);
            assert.strictEqual(buffer.readUInt16BE(0), 65535);

            buffer.fill(0);
            S7.SetWordAt(buffer, 0, 65535);
            assert.strictEqual(buffer.readUInt16BE(0), 65535);
        });

        it('GetUDIntAt/GetDWordAt should return correct unsigned 32-bit value', () => {
            buffer.writeUInt32BE(4294967295, 0);
            assert.strictEqual(S7.GetUDIntAt(buffer, 0), 4294967295);
            assert.strictEqual(S7.GetDWordAt(buffer, 0), 4294967295);
        });

        it('SetUDIntAt/SetDWordAt should set correct unsigned 32-bit value', () => {
            S7.SetUDIntAt(buffer, 0, 4294967295);
            assert.strictEqual(buffer.readUInt32BE(0), 4294967295);

            buffer.fill(0);
            S7.SetDWordAt(buffer, 0, 4294967295);
            assert.strictEqual(buffer.readUInt32BE(0), 4294967295);
        });

        it('GetULIntAt/GetLWordAt should return correct unsigned 64-bit value', () => {
            buffer.writeBigUInt64BE(18446744073709551615n, 0);
            assert.strictEqual(S7.GetULIntAt(buffer, 0), 18446744073709551615n);
            assert.strictEqual(S7.GetLWordAt(buffer, 0), 18446744073709551615n);
        });

        it('SetULIntAt/SetLWordAt should set correct unsigned 64-bit value', () => {
            S7.SetULIntAt(buffer, 0, 18446744073709551615n);
            assert.strictEqual(buffer.readBigUInt64BE(0), 18446744073709551615n);

            buffer.fill(0);
            S7.SetLWordAt(buffer, 0, 18446744073709551615n);
            assert.strictEqual(buffer.readBigUInt64BE(0), 18446744073709551615n);
        });

        it('GetByteAt should return correct byte value', () => {
            buffer[0] = 0xAB;
            assert.strictEqual(S7.GetByteAt(buffer, 0), 0xAB);
        });

        it('SetByteAt should set correct byte value', () => {
            S7.SetByteAt(buffer, 0, 0xCD);
            assert.strictEqual(buffer[0], 0xCD);
        });
    });

    describe('Floating Point Numbers', () => {
        it('GetRealAt should return correct 32-bit float value', () => {
            buffer.writeFloatBE(123.456, 0);
            assert.approximately(S7.GetRealAt(buffer, 0), 123.456, 0.001);

            buffer.writeFloatBE(-123.456, 0);
            assert.approximately(S7.GetRealAt(buffer, 0), -123.456, 0.001);
        });

        it('SetRealAt should set correct 32-bit float value', () => {
            S7.SetRealAt(buffer, 0, 123.456);
            assert.approximately(buffer.readFloatBE(0), 123.456, 0.001);

            S7.SetRealAt(buffer, 0, -123.456);
            assert.approximately(buffer.readFloatBE(0), -123.456, 0.001);
        });

        it('GetLRealAt should return correct 64-bit float value', () => {
            buffer.writeDoubleBE(123456.789012, 0);
            assert.approximately(S7.GetLRealAt(buffer, 0), 123456.789012, 0.000001);

            buffer.writeDoubleBE(-123456.789012, 0);
            assert.approximately(S7.GetLRealAt(buffer, 0), -123456.789012, 0.000001);
        });

        it('SetLRealAt should set correct 64-bit float value', () => {
            S7.SetLRealAt(buffer, 0, 123456.789012);
            assert.approximately(buffer.readDoubleBE(0), 123456.789012, 0.000001);

            S7.SetLRealAt(buffer, 0, -123456.789012);
            assert.approximately(buffer.readDoubleBE(0), -123456.789012, 0.000001);
        });
    });

    describe('String Operations', () => {
        it('GetStringAt should return correct string value', () => {
            const testString = "Hello";
            buffer[0] = 10; // Max length
            buffer[1] = 5;  // Actual length
            buffer.write(testString, 2, 'utf8');

            assert.strictEqual(S7.GetStringAt(buffer, 0), "Hello");
        });

        it('SetStringAt should set correct string value', () => {
            S7.SetStringAt(buffer, 0, 10, "Hello");

            assert.strictEqual(buffer[0], 10); // Max length
            assert.strictEqual(buffer[1], 5);  // Actual length
            assert.strictEqual(buffer.toString('utf8', 2, 7), "Hello");

            // Test truncation
            S7.SetStringAt(buffer, 0, 3, "Hello");
            assert.strictEqual(buffer[0], 3); // Max length
            assert.strictEqual(buffer[1], 3);  // Actual length
            assert.strictEqual(buffer.toString('utf8', 2, 5), "Hel");
        });

        it('GetCharsAt should return correct characters', () => {
            buffer.write("Test", 0, 'utf8');
            assert.strictEqual(S7.GetCharsAt(buffer, 0, 4), "Test");

            // Partial read
            assert.strictEqual(S7.GetCharsAt(buffer, 1, 2), "es");
        });

        it('SetCharsAt should set correct characters', () => {
            const bytesWritten = S7.SetCharsAt(buffer, 0, "Test");
            assert.strictEqual(bytesWritten, 4);
            assert.strictEqual(buffer.toString('utf8', 0, 4), "Test");

            // Test truncation at buffer end
            const smallBuffer = Buffer.alloc(3);
            const bytesWritten2 = S7.SetCharsAt(smallBuffer, 0, "Hello");
            assert.strictEqual(bytesWritten2, 3);
            assert.strictEqual(smallBuffer.toString('utf8', 0, 3), "Hel");
        });
    });
});