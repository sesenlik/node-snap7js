const net = require('net');
const { Buffer } = require('buffer');

class S7Consts {
    // Error codes
    static errTCPSocketCreation = 0x00000001;
    static errTCPConnectionTimeout = 0x00000002;
    static errTCPConnectionFailed = 0x00000003;
    static errTCPReceiveTimeout = 0x00000004;
    static errTCPDataReceive = 0x00000005;
    static errTCPSendTimeout = 0x00000006;
    static errTCPDataSend = 0x00000007;
    static errTCPConnectionReset = 0x00000008;
    static errTCPNotConnected = 0x00000009;
    static errTCPUnreachableHost = 0x00002751;

    static errIsoConnect = 0x00010000;
    static errIsoInvalidPDU = 0x00030000;
    static errIsoInvalidDataSize = 0x00040000;

    static errCliNegotiatingPDU = 0x00100000;
    static errCliInvalidParams = 0x00200000;
    static errCliJobPending = 0x00300000;
    static errCliTooManyItems = 0x00400000;
    static errCliInvalidWordLen = 0x00500000;
    static errCliPartialDataWritten = 0x00600000;
    static errCliSizeOverPDU = 0x00700000;
    static errCliInvalidPlcAnswer = 0x00800000;
    static errCliAddressOutOfRange = 0x00900000;
    static errCliInvalidTransportSize = 0x00A00000;
    static errCliWriteDataSizeMismatch = 0x00B00000;
    static errCliItemNotAvailable = 0x00C00000;
    static errCliInvalidValue = 0x00D00000;
    static errCliCannotStartPLC = 0x00E00000;
    static errCliAlreadyRun = 0x00F00000;
    static errCliCannotStopPLC = 0x01000000;
    static errCliCannotCopyRamToRom = 0x01100000;
    static errCliCannotCompress = 0x01200000;
    static errCliAlreadyStop = 0x01300000;
    static errCliFunNotAvailable = 0x01400000;
    static errCliUploadSequenceFailed = 0x01500000;
    static errCliInvalidDataSizeRecvd = 0x01600000;
    static errCliInvalidBlockType = 0x01700000;
    static errCliInvalidBlockNumber = 0x01800000;
    static errCliInvalidBlockSize = 0x01900000;
    static errCliNeedPassword = 0x01D00000;
    static errCliInvalidPassword = 0x01E00000;
    static errCliNoPasswordToSetOrClear = 0x01F00000;
    static errCliJobTimeout = 0x02000000;
    static errCliPartialDataRead = 0x02100000;
    static errCliBufferTooSmall = 0x02200000;
    static errCliFunctionRefused = 0x02300000;
    static errCliDestroying = 0x02400000;
    static errCliInvalidParamNumber = 0x02500000;
    static errCliCannotChangeParam = 0x02600000;
    static errCliFunctionNotImplemented = 0x02700000;

    // Parameter constants
    static p_u16_LocalPort = 1;
    static p_u16_RemotePort = 2;
    static p_i32_PingTimeout = 3;
    static p_i32_SendTimeout = 4;
    static p_i32_RecvTimeout = 5;
    static p_i32_WorkInterval = 6;
    static p_u16_SrcRef = 7;
    static p_u16_DstRef = 8;
    static p_u16_SrcTSap = 9;
    static p_i32_PDURequest = 10;
    static p_i32_MaxClients = 11;
    static p_i32_BSendTimeout = 12;
    static p_i32_BRecvTimeout = 13;
    static p_u32_RecoveryTime = 14;
    static p_u32_KeepAliveTime = 15;

    // Area IDs
    static S7AreaPE = 0x81;
    static S7AreaPA = 0x82;
    static S7AreaMK = 0x83;
    static S7AreaDB = 0x84;
    static S7AreaCT = 0x1C;
    static S7AreaTM = 0x1D;

    // Word Length
    static S7WLBit = 0x01;
    static S7WLByte = 0x02;
    static S7WLChar = 0x03;
    static S7WLWord = 0x04;
    static S7WLInt = 0x05;
    static S7WLDWord = 0x06;
    static S7WLDInt = 0x07;
    static S7WLReal = 0x08;
    static S7WLCounter = 0x1C;
    static S7WLTimer = 0x1D;

    // PLC Status
    static S7CpuStatusUnknown = 0x00;
    static S7CpuStatusRun = 0x08;
    static S7CpuStatusStop = 0x04;
}

// S7Tag structure - using a class to maintain similar structure
class S7Tag {
    constructor() {
        this.Area = 0;
        this.DBNumber = 0;
        this.Start = 0;
        this.Elements = 0;
        this.WordLen = 0;
    }
}




class S7Client {
    constructor() {
        this.Socket = null;
        this.DefaultTimeout = 2000;
        this._RecvTimeout = this.DefaultTimeout;
        this._SendTimeout = this.DefaultTimeout;
        this._ConnTimeout = this.DefaultTimeout;
        this._LastError = 0;
        this.IPAddress = "";
        this._PLCPort = 102;
        this.Time_ms = 0;
        //this.Connected = false;
        this.LocalTSAP_HI = 0;
        this.LocalTSAP_LO = 0;
        this.RemoteTSAP_HI = 0;
        this.RemoteTSAP_LO = 0;
        this.PDU = Buffer.alloc(2048);
        // ISO Connection Request telegram (contains also ISO Header and COTP Header)
        this.ISO_CR = Buffer.from([
            // TPKT (RFC1006 Header)
            0x03, // RFC 1006 ID (3) 
            0x00, // Reserved, always 0
            0x00, // High part of packet lenght (entire frame, payload and TPDU included)
            0x16, // Low part of packet lenght (entire frame, payload and TPDU included)
            // COTP (ISO 8073 Header)
            0x11, // PDU Size Length
            0xE0, // CR - Connection Request ID
            0x00, // Dst Reference HI
            0x00, // Dst Reference LO
            0x00, // Src Reference HI
            0x01, // Src Reference LO
            0x00, // Class + Options Flags
            0xC0, // PDU Max Length ID
            0x01, // PDU Max Length HI
            0x0A, // PDU Max Length LO
            0xC1, // Src TSAP Identifier
            0x02, // Src TSAP Length (2 bytes)
            0x01, // Src TSAP HI (will be overwritten)
            0x00, // Src TSAP LO (will be overwritten)
            0xC2, // Dst TSAP Identifier
            0x02, // Dst TSAP Length (2 bytes)
            0x01, // Dst TSAP HI (will be overwritten)
            0x02  // Dst TSAP LO (will be overwritten)
        ]);
        // S7 PDU Negotiation Telegram (contains also ISO Header and COTP Header)
        this.S7_PN = Buffer.from([
            0x03, 0x00, 0x00, 0x19,
            0x02, 0xf0, 0x80, // TPKT + COTP (see above for info)
            0x32, 0x01, 0x00, 0x00,
            0x04, 0x00, 0x00, 0x08,
            0x00, 0x00, 0xf0, 0x00,
            0x00, 0x01, 0x00, 0x01,
            0x00, 0x1e        // PDU Length Requested = HI-LO Here Default 480 bytes
        ]);

        this.S7_RW = Buffer.from([ // 31-35 bytes
            0x03, 0x00,
            0x00, 0x1f,       // Telegram Length (Data Size + 31 or 35)
            0x02, 0xf0, 0x80, // COTP (see above for info)
            0x32,            // S7 Protocol ID 
            0x01,            // Job Type
            0x00, 0x00,       // Redundancy identification
            0x05, 0x00,       // PDU Reference
            0x00, 0x0e,       // Parameters Length
            0x00, 0x00,       // Data Length = Size(bytes) + 4      
            0x04,            // Function 4 Read Var, 5 Write Var  
            0x01,            // Items count
            0x12,            // Var spec.
            0x0a,            // Length of remaining bytes
            0x10,            // Syntax ID 
            S7Consts.S7WLByte,  // Transport Size idx=22                       
            0x00, 0x00,       // Num Elements                          
            0x00, 0x00,       // DB Number (if any, else 0)            
            0x84,            // Area Type                            
            0x00, 0x00, 0x00,  // Area Offset                     
            // WR area
            0x00,            // Reserved 
            0x04,            // Transport size
            0x00, 0x00,       // Data Length * 8 (if not bit or timer or counter) 
        ]);
        this.Size_RD = 31; // Header Size when Reading 
        this.Size_WR = 35; // Header Size when Writing

        // Result transport size
        this.TS_ResBit = 0x03;
        this.TS_ResByte = 0x04;
        this.TS_ResInt = 0x05;
        this.TS_ResReal = 0x07;
        this.TS_ResOctet = 0x09;

        this.Code7Ok = 0x0000;
        this.Code7AddressOutOfRange = 0x0005;
        this.Code7InvalidTransportSize = 0x0006;
        this.Code7WriteDataSizeMismatch = 0x0007;
        this.Code7ResItemNotAvailable = 0x000A;
        this.Code7ResItemNotAvailable1 = 0xD209;
        this.Code7InvalidValue = 0xDC01;
        this.Code7NeedPassword = 0xD241;
        this.Code7InvalidPassword = 0xD602;
        this.Code7NoPasswordToClear = 0xD604;
        this.Code7NoPasswordToSet = 0xD605;
        this.Code7FunNotAvailable = 0x8104;
        this.Code7DataOverPDU = 0x8500;

        // Client Connection Type
        this.CONNTYPE_PG = 0x01;  // Connect to the PLC as a PG
        this.CONNTYPE_OP = 0x02;  // Connect to the PLC as an OP
        this.CONNTYPE_BASIC = 0x03;  // Basic connection 
        this.IsoHSize = 7; // TPKT+COTP Header Size
        this._PduSizeRequested = 480;
        this.MinPduSize = 16;
        this.LastPDUType = 0;
        this._PDULength = 0;
        this.ConnType = this.CONNTYPE_PG;
        this.CreateSocket();
    }

    CreateSocket() {
        this.Socket = new MsgSocket();
        this.Socket._ConnectTimeout = this._ConnTimeout;
        this.Socket._ReadTimeout = this._RecvTimeout;
        this.Socket._WriteTimeout = this._SendTimeout;
    }

    async TCPConnect() {
        if (this._LastError == 0) {
            try {
                this._LastError = await this.Socket.ConnectAsync(this.IPAddress, this._PLCPort);
            } catch (error) {
                this._LastError = S7Consts.errTCPConnectionFailed;
            }
        }
        return this._LastError;
    }

    async Connect() {
        this._LastError = 0;
        this._Time_ms = 0;
        var Elapsed = Date.now();
        if (!this.Connected()) {
            await this.TCPConnect(); // First stage : TCP Connection
            if (this._LastError == 0) {
                await this.ISOConnect(); // Second stage : ISOTCP (ISO 8073) Connection
                if (this._LastError == 0) {
                    this._LastError = await this.NegotiatePduLength(); // Third stage : S7 PDU negotiation
                }
            }
        }
        if (this._LastError != 0) {
            this.Disconnect();
        } else {
            this.Time_ms = Date.now() - Elapsed;
        }

        return this._LastError;
    }

    Disconnect() {
        this.Socket.Close();
    }

    Connected() {
        return (this.Socket != null) && (this.Socket.Connected);
    }
    async ConnectTo(Address, Rack, Slot) {
        const RemoteTSAP = (this.ConnType << 8) + (Rack * 0x20) + Slot;
        await this.SetConnectionParams(Address, 0x0100, RemoteTSAP);
        return await this.Connect();
    }

    SetConnectionParams(Address, LocalTSAP, RemoteTSAP) {
        const LocTSAP = LocalTSAP & 0xFFFF;
        const RemTSAP = RemoteTSAP & 0xFFFF;
        this.IPAddress = Address;
        this.LocalTSAP_HI = (LocTSAP >> 8) & 0xFF;
        this.LocalTSAP_LO = LocTSAP & 0xFF;
        this.RemoteTSAP_HI = (RemTSAP >> 8) & 0xFF;
        this.RemoteTSAP_LO = RemTSAP & 0xFF;
        return 0;
    }

    async ISOConnect() {
        var Size;
        this.ISO_CR[16] = this.LocalTSAP_HI;
        this.ISO_CR[17] = this.LocalTSAP_LO;
        this.ISO_CR[20] = this.RemoteTSAP_HI;
        this.ISO_CR[21] = this.RemoteTSAP_LO;

        this.SendPacket(this.ISO_CR);
        await this.WaitForData();
        if (this._LastError == 0) {
            Size = this.RecvIsoPacket();
            if (this._LastError == 0) {
                if (Size == 22) {
                    if (this.LastPDUType != 0xD0) { // 0xD0 = CC Connection confirm
                        this._LastError = S7Consts.errIsoConnect;
                    }
                }
                else {
                    this._LastError = S7Consts.errIsoInvalidPDU;
                }
            }
        }
        return this._LastError;

    }

    async NegotiatePduLength() {
        var Length;
        // Set PDU Size Requested
        S7.SetWordAt(this.S7_PN, 23, this._PduSizeRequested);
        // Sends the connection request telegram
        this.SendPacket(this.S7_PN);
        await this.WaitForData();
        if (this._LastError == 0) {
            Length = this.RecvIsoPacket();
            if (this._LastError == 0) {
                // check S7 Error
                if ((Length == 27) && (this.PDU[17] == 0) && (this.PDU[18] == 0)) { // 20 = size of Negotiate Answer
                    // Get PDU Size Negotiated
                    this._PDULength = S7.GetWordAt(this.PDU, 25);
                    if (this._PDULength <= 0) {
                        this._LastError = S7Consts.errCliNegotiatingPDU;
                    }
                } else {
                    this._LastError = S7Consts.errCliNegotiatingPDU;
                }
            }
        }
        return this._LastError;
    }

    SendPacket(Buffer) {
        if (this.Connected()) {
            this._SendPacket(Buffer, Buffer.length);
        } else {
            this._LastError = S7Consts.errTCPNotConnected;
        }
    }

    _SendPacket(Buffer, Len) {
        this._LastError = this.Socket.Send(Buffer, Len);
    }

    async WaitForData() {
        if (this.Connected()) {
            await this.Socket.WaitForDataAsync();
        }
    }

    RecvIsoPacket() {
        var Done = false;
        var Size = 0;

        while ((this._LastError == 0) && !Done) {
            // Get TPKT (4 bytes)
            this.RecvPacket(this.PDU, 0, 4);
            if (this._LastError == 0) {
                Size = S7.GetWordAt(this.PDU, 2);
                // Check 0 bytes Data Packet (only TPKT+COTP = 7 bytes)
                if (Size == this.IsoHSize) {
                    this.RecvPacket(this.PDU, 4, 3); // Skip remaining 3 bytes and Done is still false
                } else {
                    if ((Size > this._PduSizeRequested + this.IsoHSize) || (Size < this.MinPduSize)) {
                        this._LastError = S7Consts.errIsoInvalidPDU;
                    } else {
                        Done = true; // a valid Length !=7 && >16 && <247
                    }
                }
            }
        }
        if (this._LastError == 0) {
            this.RecvPacket(this.PDU, 4, 3); // Skip remaining 3 COTP bytes
            this.LastPDUType = this.PDU[5]; // Stores PDU Type, we need it 
            // Receives the S7 Payload          
            this.RecvPacket(this.PDU, 7, Size - this.IsoHSize);
        }
        if (this._LastError == 0) {
            return Size;
        } else {
            return 0;
        }
    }
    RecvPacket(Buffer, Start, Size) {
        if (this.Connected()) {
            this._LastError = this.Socket.Receive(Buffer, Start, Size);
        } else {
            this._LastError = S7Consts.errTCPNotConnected;
        }
    }

    async ReadArea(Area, DBNumber, Start, Amount, WordLen, Buffer) {
        //console.log("Reading... " + Date.now());
        var retObj = { LastError: 0, BytesRead: 0 };
        var Address;
        var NumElements;
        var MaxElements;
        var TotElements;
        var SizeRequested;
        var Length;
        var Offset = 0;
        var WordSize = 1;
        var BytesRead = 0;

        this._LastError = 0;
        this.Time_ms = 0;
        var Elapsed = Date.now();
        // Some adjustment
        if (Area == S7Consts.S7AreaCT) {
            WordLen = S7Consts.S7WLCounter;
        }

        if (Area == S7Consts.S7AreaTM) {
            WordLen = S7Consts.S7WLTimer;
        }

        // Calc Word size          
        WordSize = S7.DataSizeByte(WordLen);
        if (WordSize == 0) {
            retObj.LastError = S7Consts.errCliInvalidWordLen;
            this._LastError = S7Consts.errCliInvalidWordLen;
        }

        if (WordLen == S7Consts.S7WLBit) {
            Amount = 1;  // Only 1 bit can be transferred at time 
        } else {
            if ((WordLen != S7Consts.S7WLCounter) && (WordLen != S7Consts.S7WLTimer)) {
                Amount = Amount * WordSize;
                WordSize = 1;
                WordLen = S7Consts.S7WLByte;
            }
        }

        MaxElements = (this._PDULength - 18) / WordSize; // 18 = Reply telegram header
        TotElements = Amount;

        while ((TotElements > 0) && (this._LastError == 0)) {
            NumElements = TotElements;
            if (NumElements > MaxElements) {
                NumElements = MaxElements;
            }

            SizeRequested = NumElements * WordSize;

            // Setup the telegram
            this.S7_RW.copy(this.PDU, 0, 0, this.Size_RD);
            // Set DB Number
            this.PDU[27] = Area;
            // Set Area
            if (Area == S7Consts.S7AreaDB) {
                S7.SetWordAt(this.PDU, 25, DBNumber);
            }

            // Adjusts Start and word length
            if ((WordLen == S7Consts.S7WLBit) || (WordLen == S7Consts.S7WLCounter) || (WordLen == S7Consts.S7WLTimer)) {
                Address = Start;
                this.PDU[22] = WordLen;
            }
            else {
                Address = Start << 3;
            }

            // Num elements
            S7.SetWordAt(this.PDU, 23, NumElements);

            // Address into the PLC (only 3 bytes)           
            this.PDU[30] = (Address & 0x0FF);
            Address = Address >> 8;
            this.PDU[29] = (Address & 0x0FF);
            Address = Address >> 8;
            this.PDU[28] = (Address & 0x0FF);

            this._SendPacket(this.PDU, this.Size_RD);
            //console.log("Sent Read Packet... ");
            try {
                await this.WaitForData();
            } catch (error) {
                let x = 1;
            }

            //console.log("Received Read Packet... ");
            if (this._LastError == 0) {
                Length = this.RecvIsoPacket();
                if (this._LastError == 0) {
                    if (Length < 25) {
                        this._LastError = S7Consts.errIsoInvalidDataSize;
                    } else {
                        if (this.PDU[21] != 0xFF)
                            this._LastError = this.CpuError(this.PDU[21]);
                        else {
                            //Array.Copy(PDU, 25, Buffer, Offset, SizeRequested);
                            this.PDU.copy(Buffer, Offset, 25, 25 + SizeRequested);
                            Offset += SizeRequested;
                        }
                    }
                }
            }
            TotElements -= NumElements;
            Start += NumElements * WordSize;
        }
        if (this._LastError == 0) {
            BytesRead = Offset;
            this.Time_ms = Date.now() - Elapsed;
        } else {
            BytesRead = 0;
        }

        retObj.LastError = this._LastError;
        retObj.BytesRead = BytesRead;

        return Object.assign({}, retObj);

    }

    async WriteArea(Area, DBNumber, Start, Amount, WordLen, Buffer) {
        //console.log("Writing...");
        var retObj = { LastError: 0, BytesWritten: 0 };
        var Address;
        var NumElements;
        var MaxElements;
        var TotElements;
        var DataSize;
        var IsoSize;
        var Length;
        var Offset = 0;
        var WordSize = 1;
        var BytesWritten = 0;

        this._LastError = 0;
        this.Time_ms = 0;
        var Elapsed = Date.now();

        // Some adjustment
        if (Area == S7Consts.S7AreaCT) {
            WordLen = S7Consts.S7WLCounter;
        }
        if (Area == S7Consts.S7AreaTM) {
            WordLen = S7Consts.S7WLTimer;
        }
        // Calc Word size          
        WordSize = S7.DataSizeByte(WordLen);
        if (WordSize == 0) {
            return S7Consts.errCliInvalidWordLen;
        }

        if (WordLen == S7Consts.S7WLBit) {// Only 1 bit can be transferred at time
            Amount = 1;
        }
        else {
            if ((WordLen != S7Consts.S7WLCounter) && (WordLen != S7Consts.S7WLTimer)) {
                Amount = Amount * WordSize;
                WordSize = 1;
                WordLen = S7Consts.S7WLByte;
            }
        }

        MaxElements = (this._PDULength - 35) / WordSize; // 35 = Reply telegram header
        TotElements = Amount;

        while ((TotElements > 0) && (this._LastError == 0)) {
            NumElements = TotElements;
            if (NumElements > MaxElements) {
                NumElements = MaxElements;
            }

            DataSize = NumElements * WordSize;
            IsoSize = this.Size_WR + DataSize;

            // Setup the telegram
            //Array.Copy(S7_RW, 0, PDU, 0, Size_WR);
            this.S7_RW.copy(this.PDU, 0, 0, this.Size_WR);
            // Whole telegram Size
            S7.SetWordAt(this.PDU, 2, IsoSize);
            // Data Length
            Length = DataSize + 4;
            S7.SetWordAt(this.PDU, 15, Length);
            // Function
            this.PDU[17] = 0x05;
            // Set DB Number
            this.PDU[27] = Area;
            if (Area == S7Consts.S7AreaDB) {
                S7.SetWordAt(this.PDU, 25, DBNumber);
            }

            // Adjusts Start and word length
            if ((WordLen == S7Consts.S7WLBit) || (WordLen == S7Consts.S7WLCounter) || (WordLen == S7Consts.S7WLTimer)) {
                Address = Start;
                Length = DataSize;
                this.PDU[22] = WordLen;
            }
            else {
                Address = Start << 3;
                Length = DataSize << 3;
            }

            // Num elements
            S7.SetWordAt(this.PDU, 23, NumElements);
            // Address into the PLC
            this.PDU[30] = (Address & 0x0FF);
            Address = Address >> 8;
            this.PDU[29] = (Address & 0x0FF);
            Address = Address >> 8;
            this.PDU[28] = (Address & 0x0FF);

            // Transport Size
            switch (WordLen) {
                case S7Consts.S7WLBit:
                    this.PDU[32] = this.TS_ResBit;
                    break;
                case S7Consts.S7WLCounter:
                case S7Consts.S7WLTimer:
                    this.PDU[32] = this.TS_ResOctet;
                    break;
                default:
                    this.PDU[32] = this.TS_ResByte; // byte/word/dword etc.
                    break;
            };

            // Length
            S7.SetWordAt(this.PDU, 33, Length);

            // Copies the Data
            //Array.Copy(Buffer, Offset, PDU, 35, DataSize);
            Buffer.copy(this.PDU, 35, Offset, Offset + DataSize);

            this._SendPacket(this.PDU, IsoSize);
            await this.WaitForData();
            if (this._LastError == 0) {
                Length = this.RecvIsoPacket();
                if (this._LastError == 0) {
                    if (Length == 22) {
                        if (this.PDU[21] != 0xFF) {
                            this._LastError = this.CpuError(this.PDU[21]);
                        }
                    } else {
                        this._LastError = S7Consts.errIsoInvalidPDU;
                    }
                }
            }
            Offset += DataSize;
            TotElements -= NumElements;
            Start += NumElements * WordSize;
        }

        if (this._LastError == 0) {
            BytesWritten = Offset;
            this.Time_ms = Date.now() - Elapsed;
        }
        else {
            BytesWritten = 0;
        }

        retObj.LastError = this._LastError;
        retObj.BytesWritten = BytesWritten;

        return Object.assign({}, retObj);
    }

    CpuError(Error) {
        switch (Error) {
            case 0: return 0;
            case this.Code7AddressOutOfRange: return S7Consts.errCliAddressOutOfRange;
            case this.Code7InvalidTransportSize: return S7Consts.errCliInvalidTransportSize;
            case this.Code7WriteDataSizeMismatch: return S7Consts.errCliWriteDataSizeMismatch;
            case this.Code7ResItemNotAvailable:
            case this.Code7ResItemNotAvailable1: return S7Consts.errCliItemNotAvailable;
            case this.Code7DataOverPDU: return S7Consts.errCliSizeOverPDU;
            case this.Code7InvalidValue: return S7Consts.errCliInvalidValue;
            case this.Code7FunNotAvailable: return S7Consts.errCliFunNotAvailable;
            case this.Code7NeedPassword: return S7Consts.errCliNeedPassword;
            case this.Code7InvalidPassword: return S7Consts.errCliInvalidPassword;
            case this.Code7NoPasswordToSet:
            case this.Code7NoPasswordToClear: return S7Consts.errCliNoPasswordToSetOrClear;
            default:
                return S7Consts.errCliFunctionRefused;
        };
    }
    static ErrorText(Error) {
        switch (Error) {
            case 0: return "OK";
            case S7Consts.errTCPSocketCreation: return "SYS : Error creating the Socket";
            case S7Consts.errTCPConnectionTimeout: return "TCP : Connection Timeout";
            case S7Consts.errTCPConnectionFailed: return "TCP : Connection Error";
            case S7Consts.errTCPReceiveTimeout: return "TCP : Data receive Timeout";
            case S7Consts.errTCPDataReceive: return "TCP : Error receiving Data";
            case S7Consts.errTCPSendTimeout: return "TCP : Data send Timeout";
            case S7Consts.errTCPDataSend: return "TCP : Error sending Data";
            case S7Consts.errTCPConnectionReset: return "TCP : Connection reset by the Peer";
            case S7Consts.errTCPNotConnected: return "CLI : Client not connected";
            case S7Consts.errTCPUnreachableHost: return "TCP : Unreachable host";
            case S7Consts.errIsoConnect: return "ISO : Connection Error";
            case S7Consts.errIsoInvalidPDU: return "ISO : Invalid PDU received";
            case S7Consts.errIsoInvalidDataSize: return "ISO : Invalid Buffer passed to Send/Receive";
            case S7Consts.errCliNegotiatingPDU: return "CLI : Error in PDU negotiation";
            case S7Consts.errCliInvalidParams: return "CLI : invalid param(s) supplied";
            case S7Consts.errCliJobPending: return "CLI : Job pending";
            case S7Consts.errCliTooManyItems: return "CLI : too may items (>20) in multi read/write";
            case S7Consts.errCliInvalidWordLen: return "CLI : invalid WordLength";
            case S7Consts.errCliPartialDataWritten: return "CLI : Partial data written";
            case S7Consts.errCliSizeOverPDU: return "CPU : total data exceeds the PDU size";
            case S7Consts.errCliInvalidPlcAnswer: return "CLI : invalid CPU answer";
            case S7Consts.errCliAddressOutOfRange: return "CPU : Address out of range";
            case S7Consts.errCliInvalidTransportSize: return "CPU : Invalid Transport size";
            case S7Consts.errCliWriteDataSizeMismatch: return "CPU : Data size mismatch";
            case S7Consts.errCliItemNotAvailable: return "CPU : Item not available";
            case S7Consts.errCliInvalidValue: return "CPU : Invalid value supplied";
            case S7Consts.errCliCannotStartPLC: return "CPU : Cannot start PLC";
            case S7Consts.errCliAlreadyRun: return "CPU : PLC already RUN";
            case S7Consts.errCliCannotStopPLC: return "CPU : Cannot stop PLC";
            case S7Consts.errCliCannotCopyRamToRom: return "CPU : Cannot copy RAM to ROM";
            case S7Consts.errCliCannotCompress: return "CPU : Cannot compress";
            case S7Consts.errCliAlreadyStop: return "CPU : PLC already STOP";
            case S7Consts.errCliFunNotAvailable: return "CPU : Function not available";
            case S7Consts.errCliUploadSequenceFailed: return "CPU : Upload sequence failed";
            case S7Consts.errCliInvalidDataSizeRecvd: return "CLI : Invalid data size received";
            case S7Consts.errCliInvalidBlockType: return "CLI : Invalid block type";
            case S7Consts.errCliInvalidBlockNumber: return "CLI : Invalid block number";
            case S7Consts.errCliInvalidBlockSize: return "CLI : Invalid block size";
            case S7Consts.errCliNeedPassword: return "CPU : Function not authorized for current protection level";
            case S7Consts.errCliInvalidPassword: return "CPU : Invalid password";
            case S7Consts.errCliNoPasswordToSetOrClear: return "CPU : No password to set or clear";
            case S7Consts.errCliJobTimeout: return "CLI : Job Timeout";
            case S7Consts.errCliFunctionRefused: return "CLI : function refused by CPU (Unknown error)";
            case S7Consts.errCliPartialDataRead: return "CLI : Partial data read";
            case S7Consts.errCliBufferTooSmall: return "CLI : The buffer supplied is too small to accomplish the operation";
            case S7Consts.errCliDestroying: return "CLI : Cannot perform (destroying)";
            case S7Consts.errCliInvalidParamNumber: return "CLI : Invalid Param Number";
            case S7Consts.errCliCannotChangeParam: return "CLI : Cannot change this param now";
            case S7Consts.errCliFunctionNotImplemented: return "CLI : Function not implemented";
            default: return "CLI : Unknown error (0x" + Error.toString(16) + ")";
        };
    }

}



class MsgSocket {
    constructor() {
        this.TCPSocket = null;
        this.LastError = 0;
        this.Connected = false;
        this.buffer = Buffer.alloc(0);
        this._ReadTimeout = 2000;
        this._ConnectTimeout = 2000;
        this._WriteTimeout = 2000;
        this._Busy = false;
        this._NewDataReceived = false;
    }

    Close() {
        if (this.TCPSocket !== null || this.TCPSocket !== undefined) {
            this.TCPSocket = null;
        }
    }
    CreateSocket() {
        this.TCPSocket = new net.Socket();
        this.TCPSocket.setNoDelay();
        this.TCPSocket.removeAllListeners();
        this.bindEvents();
    }
    bindEvents() {
        // Connection established
        this.TCPSocket.once('connect', () => {
            this.onConnect();
        });

        // Data received
        // this.TCPSocket.on('data', (data) => {
        //     this.onData(data);
        // });

        // Connection ended by remote host
        this.TCPSocket.once('end', () => {
            this.onEnd();
        });

        // Connection fully closed
        this.TCPSocket.once('close', () => {
            this.onClose();
        });

        // Error occurred
        this.TCPSocket.once('error', (err) => {
            this.onError(err);
        });

        // Timeout occurred
        this.TCPSocket.once('timeout', () => {
            this.onTimeout();
        });
    }

    onConnect() {
        // console.log(`Connected to ${this.host}:${this.port}`);
        // this.Connected = true;
    }

    onData(data) {
        console.log('Received:', data.toString());
        this.buffer = Buffer.concat([this.buffer, data]);
        this._NewDataReceived = true;
    }

    onEnd() {
        console.log('Connection ended by server');
        this.Connected = false;
    }

    onClose() {
        console.log('Connection fully closed');
        this.Connected = false;
    }

    onError(err) {
        console.error('Connection error:', err);
        this.LastError = S7Consts.errTCPConnectionFailed;
        this.Connected = false;
    }

    onTimeout() {
        console.warn('Connection timeout');
        this.LastError = S7Consts.errTCPConnectionFailed;
        this.client.end();
        this.Connected = false;
    }

    async TCPPing(Host, Port) {
        this.LastError = 0;
        const socket = new net.Socket();
        try {
            // Set socket timeout
            socket.setTimeout(this._ConnectTimeout);

            // Wrap connection in a promise
            const connectPromise = new Promise((resolve, reject) => {
                socket.once('connect', () => {
                    socket.destroy(); // Close connection immediately after successful connect
                    resolve(0); // Success
                });

                socket.once('timeout', () => {
                    socket.destroy();
                    reject(new Error('Connection timeout'));
                });

                socket.once('error', (err) => {
                    socket.destroy();
                    reject(err);
                });
            });

            // Start connection
            socket.connect(Port, Host);

            // Wait for connection with timeout
            await connectPromise;
        } catch (error) {
            this.LastError = S7Consts.errTCPConnectionFailed;
        } finally {
            if (!socket.destroyed) {
                socket.destroy();
            }
        }

        //return this.LastError;
    }

    async ConnectAsync(Host, Port) {
        return this.LastError = await this.Connect(Host, Port);
    }
    Connect(Host, Port) {
        return new Promise((resolve, reject) => {
            this.LastError = 0;
            var Timeout = 2000;
            var timeout;

            const onConnect = () => {
                //cleanup();
                clearTimeout(timeout);
                console.log(`Connected to ${Host}:${Port}`);
                this.Connected = true;
                resolve(this.LastError);
            };

            const onError = (err) => {
                //cleanup();
                this.LastError = S7Consts.errTCPConnectionFailed;
                this.Connected = false;
                resolve(this.LastError);
            };

            const onTimeout = () => {
                //cleanup();
                this.LastError = S7Consts.errTCPConnectionTimeout;
                resolve(this.LastError);
            };

            const cleanup = () => {
                this.TCPSocket.removeListener('connect', onConnect);
                this.TCPSocket.removeListener('error', onError);
                clearTimeout(timeout);
            };


            if (this.TCPSocket) {
                this.TCPSocket.removeAllListeners();
                this.TCPSocket.destroy();
            }
            if (!this.Connected) {
                this.TCPPing(Host, Port);
                if (this.LastError === 0) {
                    try {
                        this.CreateSocket();
                        this.TCPSocket.once('connect', onConnect);
                        this.TCPSocket.once('error', onError);
                        this.TCPSocket.connect(Port, Host);
                        timeout = setTimeout(onTimeout, Timeout);
                    } catch (error) {
                        this.LastError = S7Consts.errTCPConnectionFailed;
                        resolve(this.LastError);
                    }
                } else {
                    resolve(this.LastError);
                }
            } else {
                resolve(this.LastError);
            }

            //return this.LastError;

        });
    }

    async WaitForDataAsync() {
        await this.WaitForData();
    }
    WaitForData() {
        return new Promise((resolve, reject) => {
            this.LastError = 0;
            var Timeout = this._ReadTimeout;
            var socket = this.TCPSocket;
            socket.removeAllListeners();
            const onData = (data) => {
                //console.log('Received:', data.toString());
                this.buffer = Buffer.concat([this.buffer, data]);
                cleanup();
                resolve(this.LastError);
            };

            const onError = (err) => {
                //console.log("ERROR!");
                cleanup();
                this.LastError = S7Consts.errTCPConnectionFailed;
                this.Connected = false;
                resolve(this.LastError);
            };

            const onTimeout = () => {
                //console.log("TIMEOUT!");
                cleanup();
                this.LastError = S7Consts.errTCPDataReceive;
                resolve(this.LastError);
            };

            const cleanup = () => {
                //socket.removeListener('data', onData);
                //socket.removeListener('error', onError);
                clearTimeout(timeout);
            };

            socket.once('data', onData);
            socket.once('error', onError);
            const timeout = setTimeout(onTimeout, Timeout);
        });
    }

    TCPReceive(Size) {
        if (this.buffer.length >= Size) {
            const data = this.buffer.slice(0, Size);
            this.buffer = this.buffer.slice(Size); // Remove the read portion
            return data;
        } else {
            return null; // Not enough data yet
        }
    }

    Receive(Buffer, Start, Size) {
        //this.LastError = this.WaitForData(this._ReadTimeout);
        if (this.LastError == 0) {
            var _buff = this.TCPReceive(Size);
            if (_buff === null) {
                this.LastError = S7Consts.errTCPDataReceive;
                this.Close();
                return this.LastError;
            }
            var BytesRead = _buff.length;
            if (BytesRead == 0) {
                this.LastError = S7Consts.errTCPDataReceive;
                this.Close();
                return this.LastError;
            } else {
                _buff.copy(Buffer, Start, 0, Size);
            }
        }
        return this.LastError;

    }

    Send(Buffer, Size) {
        this.LastError = 0;
        if (Size == undefined || Size == null) {
            Size = Buffer.length;
        }
        const sendBuffer = Buffer.slice(0, Size);
        try {
            var res = this.TCPSocket.write(sendBuffer);
            if (res) {
                this.LastError = 0;
            } else {
                this.LastError = S7Consts.errTCPDataSend;
                this.Connected = false;
            }

        } catch (error) {
            this.LastError = S7Consts.errTCPDataSend;
            //this.Close();
        }
        return this.LastError;
    }
}

class S7 {
    static GetBitAt(Buffer, Pos, Bit) {
        let Mask = 2 ** Bit;
        if (Bit < 0) Bit = 0;
        if (Bit > 7) Bit = 7;
        return (Buffer[Pos] & Mask) > 0;
    }
    static SetBitAt(Buffer, Pos, Bit, Value) {
        if (Bit < 0) Bit = 0;
        if (Bit > 7) Bit = 7;
        const Mask = 1 << Bit; // Create mask for the target bit

        if (Value) {
            Buffer[Pos] |= Mask; // OR operation to SET the bit (preserves others)
        } else {
            Buffer[Pos] &= ~Mask; // AND with NOT mask to CLEAR the bit (preserves others)
        }
    }

    static GetSIntAt(Buffer, Pos) {
        let Value = Buffer[Pos];
        if (Value < 128)
            return Value;
        else
            return Value - 256;
    }

    static SetSIntAt(Buffer, Pos, Value) {
        if (Value < -128) Value = -128;
        if (Value > 127) Value = 127;
        Buffer[Pos] = Value;
    }

    static GetIntAt(Buffer, Pos) {
        return Buffer.readInt16BE(Pos);
    }

    static SetIntAt(Buffer, Pos, Value) {
        Buffer.writeInt16BE(Value, Pos);
    }

    static GetDIntAt(Buffer, Pos) {
        return Buffer.readInt32BE(Pos);
    }

    static SetDIntAt(Buffer, Pos, Value) {
        Buffer.writeInt32BE(Value, Pos);
    }

    static GetLIntAt(Buffer, Pos) {
        return Buffer.readBigInt64BE(Pos);
    }

    static SetLIntAt(Buffer, Pos, Value) {
        Buffer.writeBigInt64BE(BigInt(Value), Pos);
    }

    static GetWordAt(Buffer, Pos) {
        return this.GetUIntAt(Buffer, Pos);
    }

    static GetUSIntAt(Buffer, Pos) {
        return Buffer[Pos];
    }
    static SetUSIntAt(Buffer, Pos, Value) {
        Buffer[Pos] = Value;
    }

    static SetUIntAt(Buffer, Pos, Value) {
        Buffer.writeUInt16BE(Value, Pos);
    }

    static GetUDIntAt(Buffer, Pos) {
        return Buffer.readUInt32BE(Pos);
    }

    static SetUDIntAt(Buffer, Pos, Value) {
        Buffer.writeUInt32BE(Value, Pos);
    }

    static GetULIntAt(Buffer, Pos) {
        return Buffer.readBigUInt64BE(Pos);
    }

    static SetULIntAt(Buffer, Pos, Value) {
        Buffer.writeBigUInt64BE(BigInt(Value), Pos);
    }

    static GetByteAt(Buffer, Pos) {
        return Buffer[Pos];
    }

    static SetByteAt(Buffer, Pos, Value) {
        Buffer[Pos] = Value;
    }

    static SetWordAt(Buffer, Pos, Value) {
        this.SetUIntAt(Buffer, Pos, Value);
    }

    static GetUIntAt(Buffer, Pos) {
        return Buffer.readUInt16BE(Pos);
    }

    static GetDWordAt(Buffer, Pos) {
        return this.GetUDIntAt(Buffer, Pos);
    }

    static SetDWordAt(Buffer, Pos, Value) {
        this.SetUDIntAt(Buffer, Pos, Value);
    }

    static GetLWordAt(Buffer, Pos) {
        return this.GetULIntAt(Buffer, Pos);
    }

    static SetLWordAt(Buffer, Pos, Value) {
        this.SetULIntAt(Buffer, Pos, Value);
    }

    static GetRealAt(Buffer, Pos) {
        return Buffer.readFloatBE(Pos);
    }

    static SetRealAt(Buffer, Pos, Value) {
        Buffer.writeFloatBE(Value, Pos);
    }

    static GetLRealAt(Buffer, Pos) {
        return Buffer.readDoubleBE(Pos);
    }

    static SetLRealAt(Buffer, Pos, Value) {
        Buffer.writeDoubleBE(Value, Pos);
    }

    static GetStringAt(Buffer, Pos) {
        const size = Buffer[Pos + 1];
        return Buffer.toString('utf8', Pos + 2, Pos + 2 + size);
    }

    static SetStringAt(Buffer, Pos, MaxLen, Value) {
        const size = Math.min(Value.length, MaxLen);
        Buffer[Pos] = MaxLen;
        Buffer[Pos + 1] = size;
        Buffer.write(Value.substring(0, size), Pos + 2, size, 'utf8');
    }

    static GetCharsAt(Buffer, Pos, size) {
        return Buffer.toString('utf8', Pos, Pos + size);
    }

    static SetCharsAt(Buffer, Pos, Value) {
        const maxLen = Buffer.length - Pos;
        const bytesWritten = Buffer.write(Value, Pos, maxLen, 'utf8');
        return bytesWritten;
    }

    static DataSizeByte(WordLength) {
        switch (WordLength) {
            case S7Consts.S7WLBit: return 1;  // S7 sends 1 byte per bit
            case S7Consts.S7WLByte: return 1;
            case S7Consts.S7WLChar: return 1;
            case S7Consts.S7WLWord: return 2;
            case S7Consts.S7WLDWord: return 4;
            case S7Consts.S7WLInt: return 2;
            case S7Consts.S7WLDInt: return 4;
            case S7Consts.S7WLReal: return 4;
            case S7Consts.S7WLCounter: return 2;
            case S7Consts.S7WLTimer: return 2;
            default: return 0;
        }
    }
}


module.exports = { S7Consts, S7Tag, S7Client, S7 };