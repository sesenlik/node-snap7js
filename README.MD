# :robot: node-snap7js

A pure JavaScript implementation of [Snap7](https://snap7.sourceforge.net/) client for communicating with Siemens S7 PLCs. This node is a port of [Sharp7](https://github.com/fbarresi/Sharp7), a Siemens S7 protocol driver, originally based on [Snap7](https://snap7.sourceforge.net/).

---

## :bookmark_tabs: Table of Contents

1. [Installation](#package-installation)
2. [Features](#rocket-features)
3. [PLC Configuration](#warning-important-plc-configuration)
4. [Basic Usage](#hammer_and_wrench-basic-usage)
   - [Connection Examples](#connection-examples)
   - [Read Examples](#read-examples)
   - [Write Examples](#write-examples)
5. [API Documentation](#books-api-documentation)
6. [Credits](#pray-credits)
7. [License](#receipt-license)
8. [Contact](#mailbox-contact)
9. [Disclaimer](#warning-disclaimer)

---

## :package: Installation

```bash
npm install node-snap7js
```
---

## :rocket: Features

- Connect to Siemens S7 PLCs (300/400/1200/1500)
- Read/write PLC memory areas (DB, M, I, Q, etc.)
- Support for various data types (Bit, Byte, Word, DWord, Real, etc.)
- Pure JavaScript implementation (no native dependencies)

---

## :hammer_and_wrench: Basic Usage

#### ⚠️ Important PLC Configuration

To communicate successfully with your Siemens S7 PLC, make sure the following settings are configured:

- **Enable "PUT/GET" communication** on your PLC.  
  In TIA Portal:  
  - Open your PLC device.
  - Navigate to **"Protection & Security"**.
  - Enable **"Permit access with PUT/GET communication from remote partner"**.
    ![PUT/GET enabled](img/s1.png)

- **Disable optimized block access** for any Data Blocks you plan to access.  
  In TIA Portal:  
  - Open the Data Block properties.
  - Uncheck **"Optimized block access"** under the **"Attributes"** section.
    ![Optimized Block Access disabled](img/s2.png)

Failure to apply these settings will result in connection errors or failed read/write operations.

### Connection Examples

#### Basic Connection to S7-1200/1500

```javascript
const { S7Client, S7Consts } = require('node-snap7js');

async function connectToPLC() {
  const client = new S7Client();
  
  try {
    // Connect to PLC (IP, Rack, Slot)
    // For S7-1200/1500: Rack = 0, Slot = 1
    await client.ConnectTo('192.168.0.1', 0, 1);
    
    console.log('Successfully connected to PLC!');
    console.log(`Connection time: ${client.Time_ms}ms`);
    console.log(`Negotiated PDU size: ${client._PDULength} bytes`);

    // Perform operations here...

  } catch (error) {
    console.error('Connection failed:');
    console.error(S7Client.ErrorText(client._LastError));
  } finally {
    client.Disconnect();
  }
}

connectToPLC();
```

#### Connection to S7-300 (with different rack/slot)

```javascript
// For S7-300 typically:
// - Rack = 0 (unless using multi-rack configuration)
// - Slot = 2 (for CPU in central rack)
await client.ConnectTo('192.168.0.2', 0, 2);
```

#### Connection with Custom TSAPs (Advanced)

```javascript
const client = new S7Client();

// Set connection parameters (IP, Local TSAP, Remote TSAP)
// Local TSAP: Typically 0x0100 (256) for client
// Remote TSAP: Depends on PLC configuration (often 0x0102 for PG/OP communication)
client.SetConnectionParams('192.168.0.1', 0x0100, 0x0102);

// Then connect
await client.Connect();
```

#### Connection with Timeout Configuration

```javascript
const client = new S7Client();

// Configure timeouts (in ms) before connecting
client._ConnTimeout = 5000;  // 5 second connection timeout
client._RecvTimeout = 3000;  // 3 second receive timeout
client._SendTimeout = 3000;  // 3 second send timeout

await client.ConnectTo('192.168.0.1', 0, 1);
```

#### Checking Connection Status

```javascript
if (client.Connected()) {
  console.log('PLC is connected');
} else {
  console.log('PLC is not connected');
}

// Get last error code
console.log('Last error:', client._LastError);
console.log('Error text:', S7Client.ErrorText(client._LastError));
```

#### Reconnection Pattern

```javascript
async function ensureConnected() {
  if (!client.Connected()) {
    console.log('Attempting to reconnect...');
    await client.ConnectTo('192.168.0.1', 0, 1);
    
    // Optional: Verify connection with a small read
    const testBuffer = Buffer.alloc(1);
    await client.ReadArea(S7Consts.S7AreaPE, 0, 0, 1, S7Consts.S7WLByte, testBuffer);
  }
}

// Use before any operation
await ensureConnected();
```

#### Error Handling Best Practices

```javascript
try {
  await client.ConnectTo('192.168.0.1', 0, 1);
} catch (error) {
  switch (client._LastError) {
    case S7Consts.errTCPConnectionFailed:
      console.error('Network issue - check cables and IP address');
      break;
    case S7Consts.errTCPConnectionTimeout:
      console.error('PLC not responding - check power and network');
      break;
    case S7Consts.errIsoConnect:
      console.error('ISO connection failed - check TSAP parameters');
      break;
    case S7Consts.errCliNegotiatingPDU:
      console.error('PDU negotiation failed - try smaller PDU size');
      client._PduSizeRequested = 480; // Try smaller PDU
      await client.ConnectTo('192.168.0.1', 0, 1);
      break;
    default:
      console.error('Unknown error:', S7Client.ErrorText(client._LastError));
  }
}
```

#### Common Connection Parameters

| PLC Type       | Typical Rack | Typical Slot | Notes |
|----------------|-------------|-------------|-------|
| S7-1200        | 0           | 1           |       |
| S7-1500        | 0           | 1           |       |
| S7-300 (CPU)   | 0           | 2           | Central rack |
| S7-300 (IM)    | 1+          | 3+          | Expansion racks |
| S7-400 (CPU)   | 0           | Varies      | Depends on configuration |
| S7-400 (IM)    | 1+          | Varies      | Expansion racks |

**Note:** For S7-300/400 systems, the slot number depends on the physical position of the CPU in the rack.

### Read Examples

#### Reading a single bit (boolean)

```javascript
const bitBuffer = Buffer.alloc(1);
const result = await client.ReadArea(
  S7Consts.S7AreaMK,  // Merker memory area
  0,                  // DB number (0 for Merker)
  0,                  // Start at bit 0 of byte 0
  1,                  // Read 1 bit
  S7Consts.S7WLBit,   // Bit data type
  bitBuffer
);
const bitValue = bitBuffer[0] > 0;
```

#### Reading multiple bytes from a Data Block

```javascript
const buffer = Buffer.alloc(10);
const result = await client.ReadArea(
  S7Consts.S7AreaDB,  // Data Block area
  1,                  // DB number
  0,                  // Start at byte 0
  10,                 // Read 10 bytes
  S7Consts.S7WLByte,  // Byte data type
  buffer
);
```

#### Reading different data types

```javascript
// Reading a REAL (float) value
const floatBuffer = Buffer.alloc(4);
await client.ReadArea(
  S7Consts.S7AreaDB, 1, 20, 1, S7Consts.S7WLReal, floatBuffer
);
const floatValue = floatBuffer.readFloatBE(0);

// Reading a WORD (16-bit unsigned)
const wordBuffer = Buffer.alloc(2);
await client.ReadArea(
  S7Consts.S7AreaDB, 1, 30, 1, S7Consts.S7WLWord, wordBuffer
);
const wordValue = wordBuffer.readUInt16BE(0);

// Reading a timer value
const timerBuffer = Buffer.alloc(2);
await client.ReadArea(
  S7Consts.S7AreaTM, 0, 5, 1, S7Consts.S7WLTimer, timerBuffer
);
const timerValue = timerBuffer.readUInt16BE(0);
```

#### Reading from different memory areas

```javascript
// Inputs (I area)
const inputBuffer = Buffer.alloc(2);
await client.ReadArea(
  S7Consts.S7AreaPE, 0, 0, 2, S7Consts.S7WLByte, inputBuffer
);

// Outputs (Q area)
const outputBuffer = Buffer.alloc(2);
await client.ReadArea(
  S7Consts.S7AreaPA, 0, 0, 2, S7Consts.S7WLByte, outputBuffer
);

// Counters (C area)
const counterBuffer = Buffer.alloc(2);
await client.ReadArea(
  S7Consts.S7AreaCT, 0, 0, 1, S7Consts.S7WLCounter, counterBuffer
);
```
### Write Examples

#### Writing a single bit (boolean)

```javascript
const bitValue = Buffer.alloc(1);
bitValue[0] = 1; // Set to true (0 for false)

const result = await client.WriteArea(
  S7Consts.S7AreaMK,  // Merker memory area
  0,                  // DB number (0 for Merker)
  0,                  // Start at bit 0 of byte 0
  1,                  // Write 1 bit
  S7Consts.S7WLBit,   // Bit data type
  bitValue
);
```

#### Writing multiple bytes to a Data Block

```javascript
const data = Buffer.from([0x11, 0x22, 0x33, 0x44]);

const result = await client.WriteArea(
  S7Consts.S7AreaDB,  // Data Block area
  1,                  // DB number
  10,                 // Start at byte 10
  4,                  // Write 4 bytes
  S7Consts.S7WLByte,  // Byte data type
  data
);
```

#### Writing a floating point value

```javascript
const floatValue = Buffer.alloc(4);
floatValue.writeFloatBE(123.456, 0); // Write float to buffer

const result = await client.WriteArea(
  S7Consts.S7AreaDB,  // Data Block area
  1,                  // DB number
  20,                 // Start at byte 20
  1,                  // Write 1 REAL value (4 bytes)
  S7Consts.S7WLReal,  // Real data type
  floatValue
);
```

---

## :books: API Documentation

### S7Client

Main class for PLC communication.

#### Methods
- `ConnectTo(ip, rack, slot)`: Connect to PLC
- `ReadArea(area, dbNumber, start, amount, wordLen, buffer)`: Read PLC data
- `WriteArea(area, dbNumber, start, amount, wordLen, buffer)`: Write PLC data
- `Disconnect()`: Close connection

### S7Consts

Contains all constants for areas, word lengths, etc.

**Memory Areas:**
- `S7AreaPE` - Inputs (I)
- `S7AreaPA` - Outputs (Q) 
- `S7AreaMK` - Memory (M)
- `S7AreaDB` - Data Blocks
- `S7AreaCT` - Counters
- `S7AreaTM` - Timers

**Data Types:**
- `S7WLBit` - Bit (1 bit)
- `S7WLByte` - Byte (8 bits)
- `S7WLWord` - Word (16 bits)
- `S7WLDWord` - Double Word (32 bits)
- `S7WLReal` - Float (32 bits)
- `S7WLCounter` - Counter value
- `S7WLTimer` - Timer value

### S7

The `S7` class provides several static utility functions for working with PLC data:

**Buffer Operations:**
- `GetWordAt(buffer, pos)` - Read 16-bit unsigned integer (WORD) from buffer
- `SetWordAt(buffer, pos, value)` - Write 16-bit unsigned integer (WORD) to buffer
- `GetUIntAt(buffer, pos)` - Alias for GetWordAt
- `SetUIntAt(buffer, pos, value)` - Alias for SetWordAt

**Data Size Calculation:**
- `DataSizeByte(wordLen)` - Returns byte size for given data type (use S7Consts.S7WLxxx values)

---

## :pray: Credits
This project is based on the following amazing open-source work:

---

## :receipt: License

This project is licensed under the [MIT License](./LICENSE).

- **[Snap7](https://snap7.sourceforge.net/)**
Siemens S7 communication library by Davide Nardella
License: LGPL-3.0

- **[Sharp7](https://github.com/fbarresi/Sharp7)**
.NET/C# port of Snap7 by Federico Barresi
License: MIT

---

## :mailbox: Contact
Maintainer: sesenlik
GitHub: [@sesenlik](https://github.com/sesenlik)

---

## :warning: Disclaimer

> **This software is not affiliated with or endorsed by Siemens AG.**  
> **S7**, **SIMATIC**, and **STEP7** are trademarks of **Siemens AG**.  
>  
> The authors of this software assume **no responsibility** for any issues arising from its use in **industrial control systems** or other **critical applications**.
