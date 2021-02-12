"use strict";
/*
 *    Class BresReader
 *      Reads FinScan board result format from given byte stream.
 *      Revisions NT/XP  34-100  - 02/2013
 *                HD    101-140  - 02/2021
 *                NOVA  500-528  - 02/2021
 */

var BresReader = (function () {

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    function BresReader() {

    }
    
    // -------------------------------------------------------------------------
    // Private methods
    // -------------------------------------------------------------------------
    function ReadRevisionIDOld(reader) {
        var val = reader.readByte();                                   // 'B'
        var c = String.fromCharCode(val);
        if (val < 26) {
            return "Old" + val;
        }
        else if ((c == 'B') || (c == 'S')) {
            var res = c + reader.readAnsiCharArray(7);                 // 'bres127'
            if (res == 'BRES000')
                res = 'BRES500';
            return res;
        }
    }
    
    function ReadInitialFileInfo(reader) {
        var RevIDStr = ReadRevisionIDOld(reader);
        var Revision = parseInt(RevIDStr.substring(4,7));

        var SpeciesStr = reader.readAnsiCharArray(12);
        var bNomTh = reader.readByte();
        var bNomWi = reader.readByte();

        if (Revision > 26) {
            var QStr = reader.readAnsiCharArray(12);
            var Cut1 = reader.readSmallInt();
            var Cut2 = reader.readSmallInt();
        }
        var add1 = 0;
        var add2 = 0;
        if ((RevIDStr.charAt(0) == 'B') && (Revision > 27)) {
            add1 = reader.readSmallInt();
            add2 = reader.readSmallInt();
        }

        var BoardId = reader.readInteger();
        
        if (Revision > 32) {
            var BDescr = reader.readByte();
        }
        
        return Revision;
    }

    function ReadBatchInfo(reader) {
        var size = reader.readInteger();
        
        var res = {};
        res.SpeciesName = reader.readShortString(25);
        res.BatchName   = reader.readShortString(25);
        res.BatchID     = reader.readShortString(20);
        res.VersConst   = reader.readShortString(50);

        return res;
    }

    function readRemanStats(reader) {
        var res = {};
        
        res.CYieldRawLen = reader.readDouble();
        res.CYieldSolLen = reader.readDouble();
        res.CAveLen = reader.readDouble();
        res.CNumber = reader.readInteger();
        reader.incOffset(4);  // Delphi offset
        
        return res;
    }
    
    function readPosArms(reader) {
        var res = [];
        
        for (var pa=1; pa<=6; pa++) {
            res[pa] = {};
            res[pa].x       = reader.readInteger();
            res[pa].ArmType = reader.readByte();
            // Delphi offset
            reader.incOffset(3);
            res[pa].PosDisplc = reader.readInteger();
            res[pa].Used      = reader.readBoolean();
            // Delphi offset
            reader.incOffset(3);
        }
        
        return res;
    }

    function ReadResultHeader(reader, Revision) {
        var res = {};
        
        res.SolType   = reader.readByte();
        res.TotVal    = reader.readDouble();
        res.LumberVal = reader.readDouble();
        res.ChipVal   = reader.readDouble();

        res.NomTh   = reader.readDouble();
        res.MeasTh  = reader.readDouble();
        res.RawTh   = reader.readDouble();
        res.iT      = reader.readInteger();
        res.AveWd   = reader.readInteger();
        res.RawLen  = reader.readInteger();
        res.x1      = reader.readInteger();
        res.x2      = reader.readInteger();
        res.BoardNr = reader.readInteger();
        res.BType   = reader.readWord();
        if (Revision < 51)
            res.OptFlags = reader.readByte();
        else if (Revision < 68)
            res.OptFlags = reader.readWord();       // 2 bytes (rev.51-67)
        else
            res.OptFlags = reader.readCardinal();   // 4 bytes (rev.68-)

        res.OptFlags2 = 0;
        if ( ((Revision >= 97) && (Revision <= 100)) || (Revision > 102) ) {
            res.OptFlags2 = reader.readCardinal();
        }
        
        if ((Revision < 128) && (
            (res.SolType == enumSolType.solTrim) ||
            (res.SolType == enumSolType.solEdging) ||
            (res.SolType == enumSolType.solUpsideDown))) {
            res.OptFlags2 = includeInSet(res.OptFlags2, enumOptSettings2.opt2_FromEdger);
            res.OptFlags2 = includeInSet(res.OptFlags2, enumOptSettings2.opt2_1ScanDirs);
        }

        if (Revision == 33) {
            reader.readInteger();
            reader.readInteger();
            reader.readInteger();
            reader.readInteger();
            reader.readInteger();
            reader.readInteger();
        }
        var REndAdjust = reader.readByte();

        if (Revision > 39) {
            res.fRawLen = reader.readSingle();
            res.fx1     = reader.readSingle();
            res.fx2     = reader.readSingle();
            res.XBI     = reader.readInteger();
            res.fAveWd  = reader.readSingle();
            res.CutOut  = reader.readInteger();
            res.fCutOut = reader.readSingle();
            res.BasePrice = reader.readInteger();
            res.RejectReason = reader.readByte();
        }

        // Alternative grading result (Rev.83-)

        if (Revision > 82) {
            res.Alt_OptGrade = reader.readShortString(8);
            res.Alt_iQ = reader.readInteger();
            if ((Revision > 517) || ((Revision < 500) && (Revision > 137))) {
                res.Alt_GradeCodeStr = reader.readShortString(25);
            }
            else {
                var Alt_GradeCode = reader.readInteger();
                res.Alt_GradeCodeStr = '' + Alt_GradeCode;
            }
            res.Alt_iProd = reader.readInteger();
            res.Alt_iSortClass = reader.readInteger();
        }

        if (Revision > 93) {
            res.OptRemanStats = readRemanStats(reader);
            res.BCSRemanStats = readRemanStats(reader);
        }

        res.NrLItems = reader.readInteger();
        res.LItems = [];
        for (var i=1; i<=res.NrLItems; i++) {
            res.LItems[i] = {};
            res.LItems[i].xL1 = reader.readInteger();
            res.LItems[i].xL2 = reader.readInteger();

            if (Revision > 52) {
                res.LItems[i].fxL1 = reader.readSingle();
                reader.readSingle();  // fxL1 is written as double but type is single
                res.LItems[i].fxL2 = reader.readSingle();
                reader.readSingle();

                if (Revision > 58)
                    res.LItems[i].RemanSol = reader.readByte();
            }
            res.LItems[i].NrWItems = reader.readInteger();

            // WItems
            res.LItems[i].WItems = [];
            for (var j=1; j<=res.LItems[i].NrWItems; j++) {    // SizeOf(WItem) = 272 = 32 + 2*QItem
                res.LItems[i].WItems[j] = {};
                res.LItems[i].WItems[j].NomWd = reader.readDouble();
                res.LItems[i].WItems[j].RawWd = reader.readDouble();
                res.LItems[i].WItems[j].iW = reader.readInteger();
                res.LItems[i].WItems[j].yc1 = reader.readInteger();
                res.LItems[i].WItems[j].yc2 = reader.readInteger();
                res.LItems[i].WItems[j].NrQItems = reader.readInteger();

                // QItems
                res.LItems[i].WItems[j].QItems = [];
                for (var k=1; k<=res.LItems[i].WItems[j].NrQItems; k++) {       // Sizeof(TQItem) was 120, so add 8 dummy bytes
                    res.LItems[i].WItems[j].QItems[k] = {};
                    if (Revision > 38) {
                        res.LItems[i].WItems[j].QItems[k].OptGrade = reader.readShortString(8);
                        // Delphi offset
                        reader.incOffset(3);

                        res.LItems[i].WItems[j].QItems[k].iQ    = reader.readInteger();
                        var GradeCode = reader.readInteger();
                        res.LItems[i].WItems[j].QItems[k].iProd = reader.readInteger();
                        res.LItems[i].WItems[j].QItems[k].iSortClass = reader.readInteger();
                        res.LItems[i].WItems[j].QItems[k].iDimUnit = reader.readInteger();
                        var TrimRule = reader.readByte();
                        // Delphi offsets
                        reader.incOffset(3);

                        res.LItems[i].WItems[j].QItems[k].xmod1     = reader.readInteger();
                        res.LItems[i].WItems[j].QItems[k].xmod2     = reader.readInteger();
                        res.LItems[i].WItems[j].QItems[k].CutOff1   = reader.readInteger();
                        res.LItems[i].WItems[j].QItems[k].CutOff2   = reader.readInteger();
                        res.LItems[i].WItems[j].QItems[k].xcut1     = reader.readInteger();
                        res.LItems[i].WItems[j].QItems[k].xcut2     = reader.readInteger();
                        res.LItems[i].WItems[j].QItems[k].Add1      = reader.readInteger();
                        res.LItems[i].WItems[j].QItems[k].Add2      = reader.readInteger();
                        res.LItems[i].WItems[j].QItems[k].ModuleLen = reader.readInteger();

                        res.LItems[i].WItems[j].QItems[k].fxmod1     = reader.readSingle();
                        res.LItems[i].WItems[j].QItems[k].fxmod2     = reader.readSingle();
                        res.LItems[i].WItems[j].QItems[k].fCutOff1   = reader.readSingle();
                        res.LItems[i].WItems[j].QItems[k].fCutOff2   = reader.readSingle();
                        res.LItems[i].WItems[j].QItems[k].fxcut1     = reader.readSingle();
                        res.LItems[i].WItems[j].QItems[k].fxcut2     = reader.readSingle();
                        res.LItems[i].WItems[j].QItems[k].fAdd1      = reader.readSingle();
                        res.LItems[i].WItems[j].QItems[k].fAdd2      = reader.readSingle();
                        res.LItems[i].WItems[j].QItems[k].fModuleLen = reader.readSingle();

                        res.LItems[i].WItems[j].QItems[k].Cut1Reason = reader.readByte();
                        res.LItems[i].WItems[j].QItems[k].Cut2Reason = reader.readByte();
                        // Delphi offsets
                        reader.readByte();
                        reader.readByte();

                        if (Revision > 112) {
                            res.LItems[i].WItems[j].QItems[k].NomLen  = reader.readInteger();
                            res.LItems[i].WItems[j].QItems[k].fNomLen = reader.readSingle();
                        }
                        else if (Revision > 38) {
                            res.LItems[i].WItems[j].QItems[k].NomLen  = 300;
                            res.LItems[i].WItems[j].QItems[k].fNomLen = 300;
                        }
                        
                        if ((Revision > 517) || ((Revision < 500) && (Revision > 137))) {
                            res.LItems[i].WItems[j].QItems[k].GradeCodeStr = reader.readShortString(25);
                            // Delphi offset
                            reader.readByte();
                            reader.readByte();
                            reader.incOffset(12*4);  // vacant
                        }
                        else {
                            res.LItems[i].WItems[j].QItems[k].GradeCodeStr = '' + GradeCode;
                        }
                    }
                    else {  // not tested
                        res.LItems[i].WItems[j].QItems[k].fxmod1   = reader.readSingle();
                        res.LItems[i].WItems[j].QItems[k].fxmod2   = reader.readSingle();
                        res.LItems[i].WItems[j].QItems[k].OptGrade = reader.readShortString(8);
                        res.LItems[i].WItems[j].QItems[k].iQ       = reader.readInteger();
                        var GradeCode = reader.readInteger();
                        res.LItems[i].WItems[j].QItems[k].iProd    = reader.readInteger();
                        res.LItems[i].WItems[j].QItems[k].iSortClass = reader.readInteger();
                        res.LItems[i].WItems[j].QItems[k].iDimUnit = reader.readInteger();
                        res.LItems[i].WItems[j].QItems[k].xmod1    = reader.readInteger();
                        res.LItems[i].WItems[j].QItems[k].xmod2    = reader.readInteger();
                        res.LItems[i].WItems[j].QItems[k].CutOff1  = reader.readInteger();
                        res.LItems[i].WItems[j].QItems[k].CutOff2  = reader.readInteger();
                        res.LItems[i].WItems[j].QItems[k].xcut1    = reader.readInteger();
                        res.LItems[i].WItems[j].QItems[k].xcut2    = reader.readInteger();
                        res.LItems[i].WItems[j].QItems[k].Add1     = reader.readInteger();
                        res.LItems[i].WItems[j].QItems[k].Add2     = reader.readInteger();
                        var TrimRule = reader.readByte();
                        res.LItems[i].WItems[j].QItems[k].ModuleLen = reader.readInteger();
                        
                        if (Revision > 34) {
                            res.LItems[i].WItems[j].QItems[k].fxmod1     = reader.readSingle();
                            res.LItems[i].WItems[j].QItems[k].fxmod2     = reader.readSingle();
                            res.LItems[i].WItems[j].QItems[k].fCutOff1   = reader.readSingle();
                            res.LItems[i].WItems[j].QItems[k].fCutOff2   = reader.readSingle();
                            res.LItems[i].WItems[j].QItems[k].fxcut1     = reader.readSingle();
                            res.LItems[i].WItems[j].QItems[k].fxcut2     = reader.readSingle();
                            res.LItems[i].WItems[j].QItems[k].fAdd1      = reader.readSingle();
                            res.LItems[i].WItems[j].QItems[k].fAdd2      = reader.readSingle();
                            res.LItems[i].WItems[j].QItems[k].fModuleLen = reader.readSingle();
                        }
                        res.LItems[i].WItems[j].QItems[k].GradeCodeStr = '' + GradeCode;
                    }
                }
            }
            res.LItems[i].EdgingSol = reader.readByte();
            res.LItems[i].ParDisplc = reader.readInteger();
            res.LItems[i].PosArms = readPosArms(reader);     // zero even with Edger
        }

        return res;
    }

    function readMainHeader(reader) {
        var res = {};

        // init
        res.Status = 0;
        res.SawMillName = '';
        res.FileName = '';
        res.DateTimeStr = '';
        res.ExtThickn = 0;
        res.SuroThickn = 0;
        res.ManualGrade = 0;
        res.RootCut = 0;
        res.TopCut = 0;
        res.RearEnc = 0;
        
        res.BoardID = 0;
        
        res.LugID  = 0;
        res.LineNr = 0;
        
        res.ExtBoardID = 0;
        
        res.MoistContent = 0;
        res.HeartwoodContent = 0;
        res.StressGrade = 0;
        
        res.ESID  = 0;
        res.CPID_Upper = 0;
        res.CPID_Front = 0;
        res.CPID_Lower = 0;
        res.CPID_Rear = 0;
        res.CPID3D = 0;
        res.ESID2 = 0;

        try {
            var OptStatus = reader.readInteger();
            res.Status = reader.readByte();            // = TImageSource

            res.SawMillName = reader.readShortString(100);
            res.FileName    = reader.readShortString(100);  // this doesn't work for some reason
            res.DateTimeStr = reader.readShortString(19);
            // Delphi offsets
            reader.incOffset(5)

            res.ExtThickn   = reader.readDouble();
            res.SuroThickn  = reader.readDouble();
            res.ManualGrade = reader.readInteger();
            res.RootCut     = reader.readInteger();
            res.TopCut      = reader.readInteger();
            var FrontEnc    = reader.readInteger();
            res.RearEnc     = reader.readInteger();

            res.BoardID = reader.readInteger();
            var SIPUID  = reader.readInteger();
            var MIPSID  = reader.readInteger();
            var SIPSID  = reader.readInteger();

            res.LugID  = reader.readInteger();
            res.LineNr = reader.readInteger();

            var PosOfEndBlade = reader.readInteger();
            var LenOfEndCut = reader.readInteger();
            res.ExtBoardID = reader.readInt64();

            reader.incOffset(4);    // Delphi offset

            var StackerID = reader.readInteger();
            res.MoistContent = reader.readSmallInt();
            res.HeartwoodContent = reader.readByte();
            reader.readByte();       // Delphi offset
            res.StressGrade = reader.readInteger();
            var Density = reader.readSmallInt();
            var CompMoisture = reader.readSmallInt();

            res.ESID = reader.readInteger();
            var ESfilename = reader.readShortString(100);
            
            // Delphi offsets
            reader.incOffset(3);

            var MIPUfilename = reader.readShortString(100);
            var SIPUfilename = reader.readShortString(100);
            var MIPSfilename = reader.readShortString(100);
            var SIPSfilename = reader.readShortString(100);

            res.CPID_Upper = reader.readInteger();
            res.CPID_Front = reader.readInteger();
            res.CPID_Lower = reader.readInteger();
            res.CPID_Rear  = reader.readInteger();
            res.CPID3D     = reader.readInteger();

            res.ESID2 = reader.readInteger();
            var ESfilename2 = reader.readShortString(100);
            
            // Nova only
            reader.readByte();
            reader.readByte();
            reader.readByte();
            var MIPSBID = reader.readInteger();         // works
            var SIPSBID = reader.readInteger();         // works

//            while (this.offset < MHdrSize)
//                reader.readByte();
        }
        catch(err) {
            // no worries, comes here when old file format with smaller MainHeader size
        }

        return res;
    }

    function ReadDefectsFromStream(reader, RevNo, ND) {
        var res = [];

        for (var i=1; i<=ND; i++) {
            res[i] = {};   // Knot is 0 in Delphi but is written as MainType + 1 so it's 1 in file
            res[i].MainType = reader.readByte()-1;
            
            res[i].SubType = reader.readByte()-1;
            if ( (RevNo === 99) || (RevNo === 100) || (RevNo > 106) ) {
                // Use heavy and light bluestain
            }
            else {  // Rev 0-98, 101-106
                if (res[i].MainType === enumMainDefect.dtBlueStain)
                    res[i].SubType = enumSubDefect.dtLight;
            }

            res[i].Shape = reader.readByte()-1;

            res[i].DL = reader.readSmallInt();
            res[i].DT = reader.readSmallInt();
            // clear split width because it meant different thing and was not used in Optim
            if (RevNo < 109) {
                if (res[i].MainType === enumMainDefect.dtSplit) {
                    res[i].DT = 0;
                }
            }

            res[i].X1 = reader.readSmallInt();
            res[i].Y1 = reader.readSmallInt();
            res[i].X2 = reader.readSmallInt();
            res[i].Y2 = reader.readSmallInt();

            res[i].Diam = reader.readSmallInt();
            res[i].Area = reader.readSmallInt();

            res[i].FDist = reader.readSmallInt();
            res[i].BDist = reader.readSmallInt();

            if (RevNo > 33) {
                res[i].xc = reader.readSmallInt();
                res[i].yc = reader.readSmallInt();

                res[i].XDiam1 = reader.readSmallInt();
                res[i].XDiam2 = reader.readSmallInt();

                res[i].ZVal = reader.readSmallInt();
                var vacant = reader.readSmallInt();
            }

            var n = reader.readSmallInt();
            res[i].XYC = n;
            res[i].DP = [];
            for (var j=1; j<=n; j++) {
                res[i].DP[j] = {};
                res[i].DP[j].x = reader.readSmallInt();
                res[i].DP[j].y = reader.readSmallInt();
            }

            res[i].KnotData = [];
            for (var j=1; j<=20; j++) {
                res[i].KnotData[j] = reader.readSmallInt();
            }
        }

        return res;
    }

    function ReadExtDefectInfosToStream(reader, RevNr, ND) {
        var res = [];
        
        for (var i=1; i<=ND; i++) {
            res[i] = {};
            reader.incOffset(8);  // Inside, MarginKnot, CentralKnot, Countable, N2LG
            res[i].FirstSlc = reader.readInteger();
            res[i].LastSlc  = reader.readInteger();
            res[i].CompIx = {};
            var front = reader.readByte();
            var up    = reader.readByte();
            var rear  = reader.readByte();
            var down  = reader.readByte();
            reader.incOffset(16);
            if (RevNr > 55) {
                var DiamX = reader.readInteger();
            }
            
            if ((RevNr > 526) || ((RevNr < 500) && (RevNr > 138))) {
                res[i].CompIx.Front = reader.readWord();
                res[i].CompIx.Up    = reader.readWord();
                res[i].CompIx.Rear  = reader.readWord();
                res[i].CompIx.Down  = reader.readWord();
                reader.incOffset(4);  // vacant
            }
            else {
                res[i].CompIx.Front = front;
                res[i].CompIx.Up    = up;
                res[i].CompIx.Rear  = rear;
                res[i].CompIx.Down  = down;
            }
        }
        return res;
    }

    function ReadCombiDefectsFromStream(reader, RevNr, NC) {
        var res = [];
        
        for (var i=1; i<=NC; i++) {
            res[i] = {};
            res[i].MainType = reader.readByte();
            res[i].SubType  = reader.readByte();
            reader.readByte();   // Delphi offset + IsSpikeKnot
            reader.readByte();
            res[i].DiamEff  = reader.readSmallInt();
            res[i].xc    = reader.readSmallInt();
            res[i].yc    = reader.readSmallInt();
            res[i].FDist = reader.readSmallInt();
            res[i].BDist = reader.readSmallInt();
            res[i].x1    = reader.readSmallInt();
            res[i].x2    = reader.readSmallInt();
            res[i].y1    = reader.readSmallInt();
            res[i].y2    = reader.readSmallInt();
            var front    = reader.readByte();
            var up       = reader.readByte();
            var rear     = reader.readByte();
            var down     = reader.readByte();
            var PithIsInside  = reader.readBoolean();    // not tested
            
            // Delphi offsets
            reader.incOffset(5);
            var Pith_y   = reader.readDouble();
            var Pith_z   = reader.readDouble();
            res[i].FirstSlc = reader.readInteger();
            res[i].LastSlc  = reader.readInteger();
            if ((RevNr > 526) || ((RevNr < 500) && (RevNr > 138))) {
                res[i].Front = reader.readWord();
                res[i].Up    = reader.readWord();
                res[i].Rear  = reader.readWord();
                res[i].Down  = reader.readWord();
                reader.incOffset(8); // vacant
            }
            else {
                res[i].Front = front;
                res[i].Up    = up;
                res[i].Rear  = rear;
                res[i].Down  = down;
            }
        }
        return res;
    }

    function ReadXuTexture(reader, RevNr) {
        const len_TEmptyTextureArray_NOVA10 = 52800;
        const len_TEmptyTextureArray_NOVA6  = 31680;
        const len_TEmptyTextureArray_HD = 15840;
        const len_TEmptyTexture         = 40;
        const len_TEmptyTextureArray101 = 13464;
        const len_TEmptyTexture101      = 34;
        const len_TEmptyTextureArray79  = 11088;
        const len_TEmptyTexture79       = 28;
        const len_TEmptyTextureArray78  = 7920;
        const len_TEmptyTexture78       = 20;
        const len_TEmptyTextureArray76  = 5544;
        const len_TEmptyTexture76       = 14;
        const len_TEmptyTextureArray75  = 4752;
        const len_TEmptyTexture75       = 12;

        var TxCount = reader.readInteger();              // Emptytxcount
        if (RevNr >= 505) {
            reader.incOffset(len_TEmptyTextureArray_NOVA10);  // TxArray
            reader.incOffset(len_TEmptyTexture);              // TxSum
        }
        else if (RevNr >= 500) {
            reader.incOffset(len_TEmptyTextureArray_NOVA6);  // TxArray
            reader.incOffset(len_TEmptyTexture);             // TxSum
        }
        else if (RevNr > 101) {
            reader.incOffset(len_TEmptyTextureArray_HD);     // TxArray
            reader.incOffset(len_TEmptyTexture);             // TxSum
        }
        else if (RevNr > 100) {
            reader.incOffset(len_TEmptyTextureArray101);
            reader.incOffset(len_TEmptyTexture101);
        }
        else if (RevNr > 95) {
            reader.incOffset(len_TEmptyTextureArray_HD);
            reader.incOffset(len_TEmptyTexture);
        }
        else if (RevNr > 79) {
            reader.incOffset(len_TEmptyTextureArray101);
            reader.incOffset(len_TEmptyTexture101);
        }
        else if (RevNr > 78) {
            reader.incOffset(len_TEmptyTextureArray79);
            reader.incOffset(len_TEmptyTexture79);
        }
        else if (RevNr > 76) {
            reader.incOffset(len_TEmptyTextureArray78);
            reader.incOffset(len_TEmptyTexture78);
        }
        else if (RevNr > 75) {
            reader.incOffset(len_TEmptyTextureArray76);
            reader.incOffset(len_TEmptyTexture76);
        }
        else {
            reader.incOffset(len_TEmptyTextureArray75);
            reader.incOffset(len_TEmptyTexture75);
        }
    }
    
    function ReadThicknData(reader, RevNr, NrHeads) {
        var res = [];
        
        var NT = 0;
        if (RevNr >= 132)
            NT = 4
        else
            NT = NrHeads;
          
        for (var i=1; i<=NT; i++) {
            res[i] = {};
            res[i].ThID = reader.readSmallInt();
            res[i].Thickness = reader.readSmallInt();

            var nrProfPoints = 0;
            if (RevNr > 48)
                nrProfPoints = 40;
            else
                nrProfPoints = 10;
            
            res[i].ProfilePoints = [];
            for (var k=1; k<=nrProfPoints; k++) {
                res[i].ProfilePoints[k] = [];
                for (var j=1; j<=2; j++) {
                    res[i].ProfilePoints[k][j] = reader.readSmallInt();  // array[1..40, 1..2] of smallint;
                }
            }

            res[i].CupUp  = reader.readSmallInt();
            res[i].CupLow = reader.readSmallInt();
            if (RevNr <= 48)
                res[i].CupLow = res[i].CupUp;        // CupDiam
                
//            res[i].ThEData = {};
//            res[i].ThEData.ThErrSens = [];
//            for (var k=1; k<=2; k++) {
//                res[i].ThEData.ThErrSens[k] = [];
//                for (var j=1; j<=4; j++) {
//                    res[i].ThEData.ThErrSens[k][j] = reader.readSmallInt();  // array[1..2, 1..4] of smallint;
//                }
//            }
//                res[i].ThEData.ThErrProf = {};
//                res[i].ThEData.ThErrProf.ThEStepUp = reader.readInteger();
//                res[i].ThEData.ThErrProf.ThEStepLo = reader.readInteger();
//                res[i].ThEData.ThErrProf.ThETwoInOne = reader.readInteger();
//                res[i].ThEData.ThErrEnc = {};
//                res[i].ThEData.ThErrEnc.ThErrEncStep = reader.readInteger();
//                res[i].ThEData.ThErrEnc.ThErrReversing = reader.readInteger();
//            reader.readInteger(); reader.readInteger(); reader.readInteger(); reader.readInteger(); reader.readInteger();
            reader.incOffset(36);   // ThEData: TThErrors;

            res[i].ErrorCode = reader.readWord();
            // Delphi offsets
            reader.readByte();
            reader.readByte();
            res[i].THDataCounter = reader.readCardinal();
            
            res[i].Thickness2 = 0;
            res[i].Thickness3 = 0;
            res[i].ValidUp  = 1;
            res[i].ValidLow = 1;
            res[i].BrdWidthUp = 0;
            res[i].BrdWidthLo = 0;
            res[i].IsTemperature = false;
            if (RevNr > 48) {
                res[i].Thickness2 = reader.readSmallInt();
                res[i].Thickness3 = reader.readSmallInt();

                if (RevNr > 59) {
                    res[i].ValidUp  = reader.readSingle();
                    res[i].ValidLow = reader.readSingle();
                
                    if ((RevNr >= 517) || ((RevNr < 500) && (RevNr >= 132))) {
                        res[i].BrdWidthUp = reader.readSmallInt();
                        res[i].BrdWidthLo = reader.readSmallInt();
                        res[i].IsTemperature = reader.readBoolean();
                        reader.incOffset(3 + 4*4);  // vacant
                    }
                }
            }
        }
        
        // Convert Th error from HD to Nova
        if (RevNr < 500) {
            for (var i=1; i<=NrHeads; i++) {
                var HDError = res[i].ErrorCode;
                res[i].ErrorCode = 0;
                
                if (HDError & 0x1)
                    res[i].ErrorCode = res[i].ErrorCode | 0x40;
                if (HDError & 0x2)
                    res[i].ErrorCode = res[i].ErrorCode | 0x2;
                if (HDError & 0x4)
                    res[i].ErrorCode = res[i].ErrorCode | 0x4;
                if (HDError & 0x8)
                    res[i].ErrorCode = res[i].ErrorCode | 0x8;
                if (HDError & 0x10)
                    res[i].ErrorCode = res[i].ErrorCode | 0x10;
                if (HDError & 0x20)
                    res[i].ErrorCode = res[i].ErrorCode | 0x20;
                if (HDError & 0x40)
                    res[i].ErrorCode = res[i].ErrorCode | 0x80;
                if (HDError & 0x80)
                    res[i].ErrorCode = res[i].ErrorCode | 0x8;   // not equal
                if (HDError & 0x100)
                    res[i].ErrorCode = res[i].ErrorCode | 0x200;
                if (HDError & 0x200)
                    res[i].ErrorCode = res[i].ErrorCode | 0x400;
                if (HDError & 0x400)
                    res[i].ErrorCode = res[i].ErrorCode | 0x800;
                if (HDError & 0x800)
                    res[i].ErrorCode = res[i].ErrorCode | 0x1000;
                if (HDError & 0x1000)
                    res[i].ErrorCode = res[i].ErrorCode | 0x2000;
                if (HDError & 0x2000)
                    res[i].ErrorCode = res[i].ErrorCode | 0x4000;
                if (HDError & 0x4000)
                    res[i].ErrorCode = res[i].ErrorCode | 0x8000;
            }
        }

        return res;
    }
   
    function readECtoBOA(reader) {
        var res = {};
        res.Enable = reader.readInteger();                // if =1, then the data are valid; and =2 fored using End camera as pith   (29.06.2010 / ZX)
        res.Same_direction_Z = reader.readBoolean();      // y in same direction as Z in BOA
        res.Same_direction_Y = reader.readBoolean();      // z in same direction as Z in BOA
        res.Same_side_from_start_X = reader.readBoolean();// side camera locate in the end of board where X start in BOA
        // Output values
        res.EC_valid = reader.readBoolean();              // if the results from End Camera are valid
        res.y = reader.readInteger();                     // pith location in BOA coordinate
        res.z = reader.readInteger();              
        res.y_pith = reader.readInteger();                // pith in BOA pith definition
        res.z_pith = reader.readSingle();
        res.y_offset = reader.readInteger();              // pith offset from center of board in BOA coordinate
        res.z_offset = reader.readInteger()
        res.EC_pith_correct = reader.readBoolean();       //  if there is no case of up-side down or down-side up
        // Delphi offsets
        reader.incOffset(3);
        return res;
    }
    
    function readEndSpyResult(reader, RevNr) {
      // this is tested with 102-104, 108-110, (112, 119, 129 => new fields are empty so difficul to ensure) and 130-131, 136 & 515,518 (basically 515 is first Nova ES-version)
        var res = {};

//        var offsetStart = reader.getOffset();   // for debug
        
        res.BoardID = reader.readCardinal();
        // Delphi offset
        reader.readInteger();
        res.FrameTime = reader.readDateTime();
        res.RunDirection = reader.readInteger();
        res.x          = reader.readSingle();
        res.y          = reader.readSingle();
        res.Thickness  = reader.readSingle();
        res.Width      = reader.readSingle();
        res.AverageGap = reader.readSingle();
        res.MaxGap     = reader.readSingle();
        res.MinGap     = reader.readSingle();
        res.GapStdDev  = reader.readSingle();
        res.DarkGrainRatio = reader.readSingle();
        res.AverageDarkRingWidth = reader.readSingle();
        
        // init
        res.WarpAngle  = 0;
        res.Lightlevel = 0;
        res.Rejected   = 0;
        res.Xlog       = 0;
        res.BoardFileName = '';
        res.BluestainPercent = 0;
        res.RotPercent   = 0;
        res.VoidPercent  = 0;
        res.ShakeLength  = 0;
        res.TreeAge = 0;
        res.Split = {};
        res.Split.Count  = 0;
        res.Tree_Species = 0;
        res.DarkBlueStainPercent = 0;
        res.CupShapeOffset     = 0;
        res.CupShapeOffsetUp   = 0;
        res.CupShapeOffsetDown = 0;
        res.pith_X = 0;
        res.pith_y = 0;
        res.pith_y_relative_value = 0;
        res.pithQuadr = 0;
        res.Roughness = 0;
        res.EC = {};
        
        if (RevNr > 92) {
            res.WarpAngle  = reader.readInteger();
            res.Lightlevel = reader.readInteger();
            res.Rejected   = reader.readInteger();
            res.Xlog       = reader.readInteger();
            res.BoardFileName = reader.readShortString(100);
            // Delphi offsets
            reader.readByte();
            reader.readByte();
            reader.readByte();
        }
        if ((RevNr > 107) || (RevNr == 100)) {
            res.BluestainPercent = reader.readInteger();
            res.RotPercent       = reader.readInteger();
            if ((RevNr >= 502) || ((RevNr < 500) && (RevNr > 115))) {
                res.VoidPercent  = reader.readInteger();
                res.ShakeLength  = reader.readSingle();
            }
            else {
                res.ShakeLength  = reader.readInteger();
                reader.readInteger();    // Delphi offset
            }
            res.TreeAge  = reader.readInteger();
            var SendTime = reader.readDateTime(); 
            var ReadTime = reader.readDateTime();
        }
        
        if (RevNr > 114) {
            res.Split.Count = reader.readInteger();
            res.Split.Splits = [];
            for (var i=1; i<=res.Split.Count; i++) {
                res.Split.Splits[i] = {};
                reader.incOffset(4*4);   // x1, y1, x2, y2                   // End points of a split in 1/10 mm
                res.Split.Splits[i].Width  = reader.readInteger();           // Width and length of a split. Width in 1/10 mm, length in mm
                res.Split.Splits[i].Length = reader.readInteger();
                reader.incOffset(4*4);   // xup1, xup2, xdn1, xdn2           // Open on up and down surface
                if ((RevNr >= 503) || ((RevNr < 500) && (RevNr > 117))) {
                    res.Split.Splits[i].split_type = reader.readSmallInt();  // 0 = undefined, 1 = heart, 2 = cup
                    reader.readSmallInt();   // diameter                     // twice distance of cup shape split to pith [mm]
                }
            }
            var splitC = 10;
            var splitSize = 40;
            if ((RevNr >= 502) || ((RevNr < 500) && (RevNr > 115))) {
                splitC = 30;
                if ((RevNr >= 503) || ((RevNr < 500) && (RevNr > 117)))
                    splitSize = 44;
            }
            reader.incOffset((splitC-res.Split.Count)*splitSize);
            
            reader.incOffset(2*364);       // Bluestain + Rot defects
            if ((RevNr >= 502) || ((RevNr < 500) && (RevNr > 115)))
                reader.incOffset(2*244);   // Edge voids
            
            var camNum = reader.readInteger();
            if ((RevNr >= 508) || ((RevNr < 500) && (RevNr > 121))) {
                res.Tree_Species = reader.readInteger();                   // 2 spruce, 0 not activated; -2 fir
                                                                           // Rev > 127: 0 no class (WOOD_SPECIE_CODE_NO_CLASS); 1 fir  (WOOD_SPECIE_CODE_FIR); 2 spruce (WOOD_SPECIE_CODE_SPRUCE) ;
                res.DarkBlueStainPercent = reader.readInteger();
            }
            if ((RevNr > 513) || ((RevNr < 500) && (RevNr > 127))) {
                res.CupShapeOffset     = reader.readSingle();
                res.CupShapeOffsetUp   = reader.readSingle();
                res.CupShapeOffsetDown = reader.readSingle();

                res.pith_X = reader.readInteger();
                res.pith_y = reader.readInteger();
                res.pith_y_relative_value = reader.readSingle();
                res.pithQuadr = reader.readInteger();
                res.Roughness = reader.readInteger();
                reader.incOffset(37*4);  // vacant
            }
            res.EC = readECtoBOA(reader);
            if ( ((RevNr >= 503) && (RevNr <= 513)) ||   // Delphi offset (needed with 119, 122, 126 at least)
                 ((RevNr >= 118) && (RevNr <= 127)) )
                reader.readInteger();
        }
        else if (RevNr > 111) {
            res.EC = readECtoBOA(reader);
            res.Split.Count = reader.readInteger();
            reader.incOffset(400);     // Split
            reader.incOffset(2*364);   // Bluestain + Rot defects
        }
        
        if (((RevNr <= 107) && (RevNr != 100)) || (RevNr == 115) || (RevNr == 500) || (RevNr == 501))
            reader.readInteger();
        
//        var offsetEnd = reader.getOffset();
//        var readLen = offsetEnd - offsetStart;
        // Record sizes:                      ReadLen tested
        // >  90: TBoardEndResult92:    64     -
        // >  92: TBoardEndResult99:   184     x
        // >  99: TBoardEndResult111:  216     x
        // > 100: TBoardEndResult107:  184     x
        // > 107: TBoardEndResult111:  216     x
        // > 111: TBoardEndResult114: 1384     x
        // > 114: TBoardEndResult115: 1392     x
        // > 115: TBoardEndResult117: 2680     -
        // > 117: TBoardEndResult121: 2800     x
        // > 121: TBoardEndResult127: 2808     x
        // > 127: TBoardEndResult   : 2984     x
        // < 502: TBoardEndResult115: 1392     x
        ///= 502  TBoardEndResult117: 2680     -
        // > 503: TBoardEndResult121: 2800     x
        // > 508: TBoardEndResult127: 2808     x
        // > 513: TBoardEndResult   : 2984     x
        return res;
    }
    
    function readMoistSpyResult(reader, RevNr) {
      // Tested with 119, 129, 136 + 512, 524
        var res = {};
        
        res.MoistSpySensorCount = reader.readInteger();
        res.MSRes = [];
        
        reader.incOffset(4);  // Delphi offset
        for (var i=1; i<=res.MoistSpySensorCount; i++) {
            res.MSRes[i] = {};
            res.MSRes[i].MSResStatus = reader.readInteger();
            reader.incOffset(4);   // Delphi offset
            res.MSRes[i].Enc = reader.readInt64();
            var DT = reader.readDateTime();
            res.MSRes[i].PhZ = reader.readSingle();
            res.MSRes[i].PhB = reader.readSingle();
            res.MSRes[i].AtZ = reader.readSingle();
            res.MSRes[i].AtB = reader.readSingle();
            res.MSRes[i].SensorTh = reader.readDouble();
            res.MSRes[i].SensorMoist = reader.readDouble();
            res.MSRes[i].MoistA1 = reader.readDouble();
            res.MSRes[i].MoistP1 = reader.readDouble();
            if (RevNr >= 500) {
                res.MSRes[i].SensorErrFlags = reader.readInteger();
                reader.incOffset(4);   // 5-8th (unused) byte for error flags
            }
            else {
                res.MSRes[i].SensorErrFlags = reader.readInteger();
                reader.readByte();     // 5th (unused) byte for error flags
                reader.readByte();     // Delphi offset
            }
            res.MSRes[i].NumOfPoints  = reader.readWord();
            res.MSRes[i].CenterPoint  = reader.readWord();
            res.MSRes[i].SelPointAt   = reader.readWord();
            res.MSRes[i].SelPointPh   = reader.readWord();
            res.MSRes[i].SensorPosMM  = reader.readWord();
            res.MSRes[i].SensorPosEnd = reader.readWord();
            res.MSRes[i].SelWinAtBeg  = reader.readWord();
            res.MSRes[i].SelWinAtEnd  = reader.readWord();
            res.MSRes[i].SelWinPhBeg  = reader.readWord();
            res.MSRes[i].SelWinPhEnd  = reader.readWord();
            res.MSRes[i].WanePerc = reader.readSmallInt();
            reader.readWord();    // dummy
            if (RevNr < 500) {
                reader.readByte();  // Delphi offset
                reader.readByte();  // Delphi offset
            }
            res.MSRes[i].AdjMoist = reader.readDouble();
            reader.incOffset(182*4); // vacant

            res.MSRes[i].MRawData = {};
            res.MSRes[i].MRawData.Attenuation = [];
            res.MSRes[i].MRawData.Phase = [];
            for (var k=1; k<=200; k++)
                res.MSRes[i].MRawData.Attenuation[k] = reader.readSingle();
            for (var k=1; k<=200; k++) 
                res.MSRes[i].MRawData.Phase[k] = reader.readSingle();
        }
        reader.incOffset((8-res.MoistSpySensorCount)*2440);
        
        res.MSResMoist = [];
//        res.MSResDens  = [];
        for (var i=1; i<=res.MoistSpySensorCount; i++) {
            res.MSResMoist[i] = reader.readSingle();
        }
        reader.incOffset((8-res.MoistSpySensorCount)*4);
        reader.incOffset(8*4);  // MSResDens
        
        res.Moisture = reader.readSingle();
        var Density = reader.readSingle();
        
        res.FrozenBoard = false;
        res.ValueAve = 0;
        res.ValueStd = 0;
        res.NoFilterReason = 0;
        res.BTemperature = 0;
        res.BMXMoisture = 0;
        res.ATemperature = 0;
        res.NrBoardsInFiltering = 0;
        if ((RevNr > 512) || ((RevNr < 500) && (RevNr > 126))) {
            res.FrozenBoard = reader.readBoolean();
            reader.incOffset(3);     // Delphi offset
            res.ValueAve = reader.readSingle();
            res.ValueStd = reader.readSingle();
            res.NoFilterReason = reader.readByte();
            reader.incOffset(3);     // Delphi offset
            reader.readSingle();     // BThickn
            reader.readSingle();     // BWidth
            res.BTemperature = reader.readInteger();
            reader.readInteger();    // BNr
            res.BMXMoisture = reader.readSingle();
            res.ATemperature = reader.readInteger();
            res.NrBoardsInFiltering = reader.readWord();
            reader.readWord();       // dummy
            reader.incOffset(11*4);  // vacant
        }
        
        return res;
    }
    
    function readTexturePoints(reader, RevNr) {
        var camCount = 3;
        if (RevNr >= 505)
            camCount = 10;
        else if (RevNr >= 500)
            camCount = 6;

        var res = {};
        res.SliceCount = reader.readInteger();
        res.Turner = reader.readInteger();
        res.PD = [];
        for (var i=1; i<=camCount*132; i++) {
            res.PD[i] = {};
            res.PD[i].BegSweep   = reader.readInteger();
            res.PD[i].EndSweep   = reader.readInteger();
            res.PD[i].BegSFSweep = reader.readInteger();
            res.PD[i].EndSFSweep = reader.readInteger();
            res.PD[i].Cam        = reader.readInteger();
            res.PD[i].CamSlice   = reader.readInteger();
            reader.incOffset(4); // XPos
        }
        return res;
    }
    
    function ReadSliceData2(reader, RevNr) {
        var res = {};
        res.ipCamCount = reader.readCardinal();

        var camCount;
        var sweepCamCount;
        if (RevNr >= 525) {
            camCount = res.ipCamCount;
            sweepCamCount = res.ipCamCount;
        }
        else if (RevNr >= 505) {
            camCount = 10;
            sweepCamCount = 10;
        }
        else if (RevNr >= 500) {
            camCount = 6;       // not tested
            sweepCamCount = 1;
        }
        else {
            camCount = 3;
            sweepCamCount = 1;
        }

        res.SweepCount = [];
        for (var i=1; i<=sweepCamCount; i++)
            res.SweepCount[i] = reader.readInteger();
        
        // Calculate real cam count from sweep array
        if (res.ipCamCount == 0) {
            for (var i=1; i<=camCount; i++) {
                if (res.SweepCount[i] > 0)
                    res.ipCamCount++;
                else
                    break;
            }
        }
        
        res.SliceCount = reader.readInteger();
        if (res.SliceCount == 0)
            res.SliceCount = 128;  // ?
        
        res.SliceRGBiRImage = new Array(camCount+1);
        for (var c=1; c<=camCount; c++) {                              // cameras
            var sweeps = 800;
            if (RevNr >= 525)
                sweeps = res.SweepCount[c];
               
            // Original way - pretty slow
        
            //res.SliceRGBiRImage[c] = new Array(sweeps+1);
            //for (var sw=1; sw<=sweeps; sw++) {                         // sweeps
            //    res.SliceRGBiRImage[c][sw] = new Array(132+1);
            //    for (var sl=1; sl<=132; sl++) {                        // slices
            //        res.SliceRGBiRImage[c][sw][sl] = new Array(3+1);
            //        for (var rgb=1; rgb<=3; rgb++) {                   // RGB colors
            //            res.SliceRGBiRImage[c][sw][sl][rgb] = reader.readByte();
            //        }
            //    }
            //}
            
            // Faster way - put slices and RGB in same array
            
            res.SliceRGBiRImage[c] = new Array(sweeps+1);
            for (var sw=1; sw<=sweeps; sw++) {                         // sweeps
                res.SliceRGBiRImage[c][sw] = reader.readByteArray(132*3);
            }
        }
        
        if (RevNr < 500)
            reader.incOffset(4);  // delphi offset
        
        reader.incOffset(sweepCamCount*6400);                          // conveyorMM
        
        if (RevNr >= 505) {
            reader.incOffset(10688);                                   // IH parameters
        }
        else if (RevNr >= 500) {
            reader.incOffset(7424);
        }
        else {
            reader.incOffset(4976);
        }

        return res;
    }

    function ReadOptBoardRecFileStream(buffer, reader, RevNr, MHdrSize) {
        const MAXSLICES_NOVA10 = 1320;
        const MAXSLICES_NOVA6  =  792;
        const MAXSLICES_HD     =  396;
        if (RevNr >= 505)
          var numOfSlices = MAXSLICES_NOVA10 // NOVA 10 cams
        else if (RevNr >= 500)
          var numOfSlices = MAXSLICES_NOVA6  // NOVA 6 cams
        else
          var numOfSlices = MAXSLICES_HD;    // HD 3 cams

        var res = {};
        res.Header = {};  // to have this as first field
        
        if (RevNr < 33) {
            var BDescr = reader.readByte();
            if ((BDescr != 0) && (BDescr != 1))
                return res;
        }

        res.NP = reader.readSmallInt();
        res.Geom = [];

        for (var i=1; i<=res.NP; i++) {
            res.Geom[i] = {};
            res.Geom[i].x = reader.readSmallInt();
            res.Geom[i].P = [];
            for (var j=1; j<=10; j++) {
                res.Geom[i].P[j] = {};
                if (RevNr < 44) {
                    res.Geom[i].P[j].y = reader.readSmallInt();
                    res.Geom[i].P[j].z = reader.readSmallInt();
                }
                else {
                    res.Geom[i].P[j].y = reader.readSingle();
                    res.Geom[i].P[j].z = reader.readSingle();
                }
            }
        }

        res.UND = reader.readSmallInt();
        res.UDefect = ReadDefectsFromStream(reader, RevNr, res.UND);
        res.DND = reader.readSmallInt();
        res.DDefect = ReadDefectsFromStream(reader, RevNr, res.DND);
        res.FND = reader.readSmallInt();
        res.FDefect = ReadDefectsFromStream(reader, RevNr, res.FND);
        res.RND = reader.readSmallInt();
        res.RDefect = ReadDefectsFromStream(reader, RevNr, res.RND);

        if (RevNr > 33) {
            res.UExtDefInfos = ReadExtDefectInfosToStream(reader, RevNr, res.UND);
            res.DExtDefInfos = ReadExtDefectInfosToStream(reader, RevNr, res.DND);
            res.FExtDefInfos = ReadExtDefectInfosToStream(reader, RevNr, res.FND);
            res.RExtDefInfos = ReadExtDefectInfosToStream(reader, RevNr, res.RND);
        }

        res.NCK = 0;
        res.NCS = 0;
        if (RevNr > 81) {
            res.NCK = reader.readSmallInt();
            res.CombiKnots = ReadCombiDefectsFromStream(reader, RevNr, res.NCK);
            res.NCS = reader.readSmallInt();
            res.CombiShakes = ReadCombiDefectsFromStream(reader, RevNr, res.NCS);
        }

        res.UPinWorm = [];
        res.DPinWorm = [];
        res.FPinWorm = [];
        res.RPinWorm = [];
        if (RevNr > 31) {
            for (var i=1; i<=res.NP; i++) {
                res.UPinWorm[i] = {};
                res.UPinWorm[i].Pin  = reader.readByte();
                res.UPinWorm[i].Worm = reader.readByte();
                res.DPinWorm[i] = {};
                res.DPinWorm[i].Pin  = reader.readByte();
                res.DPinWorm[i].Worm = reader.readByte();
                res.FPinWorm[i] = {};
                res.FPinWorm[i].Pin  = reader.readByte();
                res.FPinWorm[i].Worm = reader.readByte();
                res.RPinWorm[i] = {};
                res.RPinWorm[i].Pin  = reader.readByte();
                res.RPinWorm[i].Worm = reader.readByte();
            }
        }

        res.USawStep = [];
        res.DSawStep = [];
        if (RevNr > 40) {
            for (var i=1; i<=res.NP; i++) {
                res.USawStep[i] = reader.readByte(); // = depth, 1 means 0.1 mm
                res.DSawStep[i] = reader.readByte();
            }
        }

        // Light levels
        res.ULightLevel  = [];
        res.UFLightLevel = [];
        res.URLightLevel = [];
        res.DLightLevel  = [];
        res.DFLightLevel = [];
        res.DRLightLevel = [];
        if (RevNr > 91) {
            if (RevNr < 522) {
                for (var i=1; i<=numOfSlices; i++) {
                    res.ULightLevel[i]  = reader.readByteArray(3);
                    res.DLightLevel[i]  = reader.readByteArray(3);
                    res.UFLightLevel[i] = reader.readByteArray(3);
                    res.URLightLevel[i] = reader.readByteArray(3);
                    //res.ULightLevel[i] = {};
                    //res.ULightLevel[i].R = reader.readByte(); 
                    //res.ULightLevel[i].G = reader.readByte(); 
                    //res.ULightLevel[i].B = reader.readByte();
                    //res.DLightLevel[i] = {};
                    //res.DLightLevel[i].R = reader.readByte(); 
                    //res.DLightLevel[i].G = reader.readByte(); 
                    //res.DLightLevel[i].B = reader.readByte();
                    //res.FLightLevel[i] = {};
                    //res.FLightLevel[i].R = reader.readByte(); 
                    //res.FLightLevel[i].G = reader.readByte(); 
                    //res.FLightLevel[i].B = reader.readByte();
                    //res.RLightLevel[i] = {};
                    //res.RLightLevel[i].R = reader.readByte(); 
                    //res.RLightLevel[i].G = reader.readByte(); 
                    //res.RLightLevel[i].B = reader.readByte();
                }
            }
            else {
                for (var i=1; i<=numOfSlices; i++)
                    res.ULightLevel[i]  = reader.readByteArray(3);  // U
                for (var i=1; i<=numOfSlices; i++)
                    res.UFLightLevel[i] = reader.readByteArray(3);  // UF
                for (var i=1; i<=numOfSlices; i++)
                    res.URLightLevel[i] = reader.readByteArray(3);  // UR
                for (var i=1; i<=numOfSlices; i++)
                    res.DLightLevel[i]  = reader.readByteArray(3);  // D
                for (var i=1; i<=numOfSlices; i++)
                    res.DFLightLevel[i] = reader.readByteArray(3);  // DF
                for (var i=1; i<=numOfSlices; i++)
                    res.DRLightLevel[i] = reader.readByteArray(3);  // DR
            }
        }
        else if (RevNr > 31) {
//            for (var i=1; i<=res.NP; i++) {
//                reader.readByteArray(3);  // U
//                reader.readByteArray(3);  // D
//                reader.readByteArray(3);  // (U)F
//                reader.readByteArray(3);  // (U)R
//            }
            // Ignore light levels !
            reader.incOffset(res.NP*3*4); // U + D + F + R
        }

        // Texture
        if (RevNr > 65) {
            reader.incOffset(res.NP*4); // U + D + F + R
        }

        if (RevNr > 73) {
            ReadXuTexture(reader, RevNr);  // U
            ReadXuTexture(reader, RevNr);  // D
            ReadXuTexture(reader, RevNr);  // F
            ReadXuTexture(reader, RevNr);  // R
        }

        res.PithArray = [];    // Calculated pith array
        if (RevNr > 74) {
            for (var i=1; i<=numOfSlices; i++) {
                res.PithArray[i] = {};
                res.PithArray[i].y = reader.readSmallInt();
                if (RevNr > 77) {
                    reader.readSmallInt();  // Delphi offset
                    res.PithArray[i].z = reader.readSingle();
                }
                else  // not tested
                    res.PithArray[i].z = reader.readSmallInt();
            }
        }

        // Sapwood
        if (RevNr >= 505) {           // Nova 10 cam
            reader.incOffset(21124);
        }
        else if (RevNr >= 500) {     // Nova 6 cam
            reader.incOffset(12676);
        }
        else if (RevNr > 88) {       // HD
            reader.incOffset(6340);
        }

        res.NThickH = [];
        res.NThickH[1] = reader.readSmallInt();
        res.NThickH[2] = reader.readSmallInt();
        res.ThickHeads = [];
        res.ThickHeads[1] = ReadThicknData(reader, RevNr, res.NThickH[1]);
        if (RevNr >= 132)
            res.ThickHeads[2] = ReadThicknData(reader, RevNr, res.NThickH[2]);

        res.BoardBegPoints = [];
        res.BoardEndPoints = [];
        var points = 0;
        if (RevNr > 36)
            points = 3
        else
            points = 2;
        
        for (var i=1; i<=2; i++) {
            res.BoardBegPoints[i] = [];
            for (var j=1; j<=points; j++) {
                res.BoardBegPoints[i][j] = reader.readSmallInt();
            }
        }
        for (var i=1; i<=2; i++) {
            res.BoardEndPoints[i] = [];
            for (var j=1; j<=points; j++) {
                res.BoardEndPoints[i][j] = reader.readSmallInt();
            }
        }
        if (points < 3) {
            res.BoardBegPoints[1][3] = 0;
            res.BoardBegPoints[2][3] = 0;
            res.BoardEndPoints[1][3] = 0;
            res.BoardEndPoints[2][3] = 0;
        }
        if ((res.BoardBegPoints[2][1] === 0) && (res.BoardBegPoints[2][2] > 0)) {
            res.BoardBegPoints[2][1] = res.BoardBegPoints[2][2];
            res.BoardBegPoints[2][2] = res.BoardBegPoints[1][2];
        }
        if ((res.BoardEndPoints[1][1] === 0) && (res.BoardEndPoints[1][2] > 0)) {
            res.BoardEndPoints[2][1] = res.BoardEndPoints[2][2];
            res.BoardEndPoints[2][2] = res.BoardEndPoints[1][2];
        }
        
        var readLen = 0;
        if (RevNr > 104) 
            readLen = MHdrSize;
        else if (RevNr > 100)
            readLen = 840;
        else if (RevNr < 41)
            readLen = 312;
        else if ((MHdrSize == 440) || (MHdrSize == 336))
            readLen = MHdrSize;
        //else if (RevNr < 72)
        //    readLen = 336;
        else if (RevNr < 101)
            readLen = 336;
        else
            readLen = MHdrSize;
        var r2 = new DelphiByteStreamReader(buffer, reader.getOffset(), readLen);  // use this to avoid reading too much
        res.Header = readMainHeader(r2);
        reader.incOffset(readLen);
        if (RevNr == 105) {
            res.Header.CPID3D = CPID_Front;
            res.Header.CPID_Front = 0;
        }
        if ((RevNr < 72) && (res.Header.MoistContent < 101))
            res.Header.MoistContent = 10 * res.Header.MoistContent;
        
        res.MSRave = 0;              // tested with Vaagen (RevNr 126)
        res.MCave  = 0;
        res.MSRDatas = [];
        res.MCDatas  = [];
        if (RevNr > 60) {
            for (var i=1; i<=res.NP; i++) {
                res.MSRDatas[i] = reader.readInteger();
            }
            for (var i=1; i<=res.NP; i++) {
                res.MCDatas[i] = reader.readInteger();
            }
            if (RevNr > 62)
                res.MSRave = reader.readDouble();
            if (RevNr > 63)
                res.MCave  = reader.readDouble();
        }
        else {
            for (var i=1; i<=res.NP; i++) {
                res.MSRDatas[i] = 99999;
            }
        }
        
        // EndSpy
        
        res.BoardEndResults = [];
        res.ESImageInfo = {};
        if ((RevNr > 513) || ((RevNr < 500) && (RevNr > 127))) {
            var ESRecSize = reader.readInteger();
            if (ESRecSize > 0) {
                res.BoardEndResults[1] = readEndSpyResult(reader, RevNr);
                res.BoardEndResults[2] = readEndSpyResult(reader, RevNr);
            }
            if ((RevNr > 514) || ((RevNr < 500) && (RevNr > 128))) {
                var ESImageSize = reader.readInteger();
                if (ESImageSize > 0) {
                    res.ESImageInfo.BoardID = reader.readInteger();
                    res.ESImageInfo.PithX = reader.readInteger();
                    res.ESImageInfo.PithY = reader.readInteger();
                    var iid = reader.readInteger();
                    res.ESImageInfo.ESImage1d8 = [];     // 1/8 image
                    for (var i=1; i<=135; i++) {
                        res.ESImageInfo.ESImage1d8[i] = [];
                        for (var j=1; j<=240; j++) {
                            res.ESImageInfo.ESImage1d8[i][j] = reader.readByteArray(3);  // starts from [1] in Delphi, here from [0] for speed gain ~20ms (avoid for loop below)
                            //for (var k=1; k<=3; k++) {
                            //    res.ESImageInfo.ESImage1d8[i][j][k] = readByte(data);
                            //}
                        }
                    }
                }
            }
        }
        else if (RevNr > 90) {
            res.BoardEndResults[1] = readEndSpyResult(reader, RevNr);
            if ((RevNr >= 500) || ((RevNr < 500) && (RevNr > 114))) {
                res.BoardEndResults[2] = readEndSpyResult(reader, RevNr);
            }
        }
        else if (RevNr > 89) {
            reader.incOffset(48); // not implemented/tested
        }
        
        // ES version fixes
        
        // set rot and bluestain to not-in-use
        if (RevNr < 112) {
            for (var i=1; i<=res.BoardEndResults.length-1; i++) {
                res.BoardEndResults[i].BluestainPercent = -1;
                res.BoardEndResults[i].RotPercent       = -1;
            }
        }
        if (((RevNr < 508) && (RevNr >= 500)) || (RevNr < 122)) {
            for (var i=1; i<=res.BoardEndResults.length-1; i++) {
                res.BoardEndResults[i].DarkBlueStainPercent = -1;
            }
        }
        for (var i=1; i<=res.BoardEndResults.length-1; i++) {
            if (res.BoardEndResults[i].AverageGap === 0) {
                res.BoardEndResults[i].BluestainPercent     = -1;
                res.BoardEndResults[i].RotPercent           = -1;
                res.BoardEndResults[i].DarkBlueStainPercent = -1;
            }
        }
        
        //set ES shake type to heart shake
        if ( ((RevNr < 503) && (RevNr >= 500)) ||
             ((RevNr < 118) && (RevNr > 114)) ) {
            for (var i=1; i<=res.BoardEndResults.length-1; i++) {
                if (res.BoardEndResults[i].AverageGap > 0) {
                    for (var sp=1; sp<=res.BoardEndResults[i].Split.Count; i++)
                        res.BoardEndResults[i].Splits[sp].split_type = 1;
                }
            }
        }
        
        // MoistSpy
        
        res.MoistSpyResult = {};
        res.MoistSpyResult.MoistSpySensorCount = 0;
        if ((RevNr > 513) || ((RevNr < 500) && (RevNr > 127))) {
            var MoistSpyRecSize = reader.readInteger();
            if (MoistSpyRecSize > 0)
                res.MoistSpyResult = readMoistSpyResult(reader, RevNr);
        }
        else if (RevNr > 103) {  // this includes also R513 and R127
            res.MoistSpyResult = readMoistSpyResult(reader, RevNr);
        }
        if ((RevNr < 135) || ((RevNr >= 500) && (RevNr < 523))) {
            for (var i=1; i<=res.MoistSpyResult.MoistSpySensorCount; i++) {
                if ((RevNr < 127) || ((RevNr >= 500) && (RevNr < 513))) {
                    res.MoistSpyResult.MSRes[i].SensorTh = 0;
                    if (res.MoistSpyResult.MSRes[i].SensorMoist == 0) 
                        res.MoistSpyResult.MSRes[i].SensorMoist = res.MoistSpyResult.MSResMoist[i];  // old versions didn't have moist here
                    res.MoistSpyResult.MSRes[i].MoistA1 = 0;
                    res.MoistSpyResult.MSRes[i].MoistP1 = 0;
                    res.MoistSpyResult.MSRes[i].SensorErrFlags = 0;

                    res.MoistSpyResult.MSRes[i].NumOfPoints = 0;
                    res.MoistSpyResult.MSRes[i].CenterPoint = 0;
                    res.MoistSpyResult.MSRes[i].SelPointAt = 0;
                    res.MoistSpyResult.MSRes[i].SelPointPh = 0;
                }

                if ((RevNr < 129) || ((RevNr >= 500) && (RevNr < 515))) {
                    res.MoistSpyResult.MSRes[i].SelWinAtBeg = 0;
                    res.MoistSpyResult.MSRes[i].SelWinAtEnd = 0;
                    res.MoistSpyResult.MSRes[i].SelWinPhBeg = 0;
                    res.MoistSpyResult.MSRes[i].SelWinPhEnd = 0;
                }

                if ((RevNr < 135) || ((RevNr >= 500) && (RevNr < 523))) {
                    res.MoistSpyResult.MSRes[i].WanePerc = 0;
                    res.MoistSpyResult.MSRes[i].AdjMoist = 0;
                }
            }
        }
        if ((RevNr < 135) || ((RevNr >= 500) && (RevNr < 523))) {
            if (res.MoistSpyResult.ValueAve > 0) 
                res.MoistSpyResult.NrBoardsInFiltering = 50;
        }

        if (RevNr > 108) {
            var slcSize = reader.readInteger();
            if (slcSize > 0) {
                res.UTexturePoints = readTexturePoints(reader, RevNr);
                res.DTexturePoints = readTexturePoints(reader, RevNr);
                res.FTexturePoints = readTexturePoints(reader, RevNr);
                res.RTexturePoints = readTexturePoints(reader, RevNr);
                
                res.USliceData = ReadSliceData2(reader, RevNr);
                res.DSliceData = ReadSliceData2(reader, RevNr);
                res.FSliceData = ReadSliceData2(reader, RevNr);
                res.RSliceData = ReadSliceData2(reader, RevNr);
            }
        }
        
        // PLS
        res.PLSNr = 0;
        res.PLSNames = [];
        res.PLSValues = [];
        if ((RevNr > 505) || ((RevNr < 500) && (RevNr > 119))) {
            res.PLSNr = reader.readWord();
            for (var i=1; i<=res.PLSNr; i++) {
                var idx = reader.readWord();
                idx = Math.min(idx, 100);
                res.PLSNames[idx] = reader.readCharArray(256);
                res.PLSValues[idx] = reader.readDouble();
            }
        }

        return res;
    }
    
    function readBD(reader, RevNr) {
        var res = {};
        res.Desc = reader.readShortString(30);     // doen't work correct for some reason
        reader.incOffset(1);  // Delphi offset
        res.OptimTimeDate = reader.readDateTime();
        
        // Length Measurement
        res.x1     = reader.readInteger();
        res.x2     = reader.readInteger();
        res.Length = reader.readInteger();
        
        // Width Measurement
        reader.incOffset(14*4);
        res.muWaneArea = reader.readInteger();
        res.mdWaneArea = reader.readInteger();
        reader.incOffset(2*4);
        
        // Thickness Measurement
        reader.incOffset(10*4);
        reader.incOffset(4);  // Delphi offset
        reader.incOffset(6*8);
        
        res.BVolume  = reader.readDouble();
        res.MidClNr  = reader.readInteger();
        res.OverClNr = reader.readInteger();
        
        reader.incOffset(8*4);
        var BType = reader.readWord();  // same as in ResultHeader
        reader.incOffset(2);  // Delphi offset
        res.SplSTDecF = reader.readInteger();
        
        // RCT control
        if ((RevNr < 140) || ((RevNr >= 500) && (RevNr < 528))) {
            res.WidRoot   = reader.readInteger();
            res.WidCenter = reader.readInteger();
            res.WidTop    = reader.readInteger();
        }
        else {
            res.WidRoot   = reader.readSingle();
            res.WidCenter = reader.readSingle();
            res.WidTop    = reader.readSingle();
        }
        reader.incOffset(6*4);
        
        // Warp
        reader.incOffset(3*4);
        res.CupDim = reader.readInteger();
        reader.incOffset(4);
        
        // ThMeter values
        reader.incOffset(2*4);
        res.SuroThickn = reader.readDouble();
        
        // Regression analysis
        reader.incOffset(8*8 +6*4);
        
        res.OptThickn = reader.readDouble();
        
        res.BCount   = reader.readInteger();
        res.ExtCount = reader.readInteger();
        
        res.OptTime    = reader.readInteger();
        res.OptTimeSum = reader.readInteger();
        
        res.NrTWQ = reader.readInteger();
        
        // Skew end corrections
        reader.incOffset(11*4);
        
        reader.incOffset(4*8);
        
        // Rejection type
        reader.incOffset(1);
        reader.incOffset(3);  // Delphi offset
        
        // Board taper
        reader.incOffset(4);
        
        // Ave knot distance to edge
        reader.incOffset(2*4);
        
        res._AveW = reader.readDouble();
        
        reader.incOffset(5*4+4);
        
        res._TargetW = reader.readSingle();
        
        reader.incOffset(8*4+2+2*1);
        
        return res;
    }
    
    function readRInfo(reader, RevNr) {
        var res = {};
        
        var newRInfo = false;
        if ((RevNr > 525) || ((RevNr < 500) && (RevNr > 136)))
            newRInfo = true;
        res.x1 = reader.readInteger();
        res.x2 = reader.readInteger();
        res.xLim1 = reader.readInteger();
        res.xLim2 = reader.readInteger();
        if (newRInfo)
            res.RRatio = reader.readDouble();
        else
            res.RRatio = reader.readInteger();
        res.TotLen = reader.readInteger();
        res.TotNr  = reader.readInteger();
        res.CutOut = reader.readInteger();
        res.RIntervs = [];
        if (RevNr > 56) {
            res.NrDiffComps = reader.readInteger();
            if (newRInfo) {
                for (var i=1; i<=res.TotNr; i++) {
                    res.RIntervs[i] = {};
                    res.RIntervs[i].x1 = reader.readInteger();
                    res.RIntervs[i].x2 = reader.readInteger();
                    res.RIntervs[i].Cind = reader.readSmallInt();
                    res.RIntervs[i].CompName = reader.readShortString(25);
                    res.RIntervs[i].CompCode = reader.readInteger();
                }
                reader.incOffset((100-res.TotNr)*40);
            }
            else {
                var Comp1Name = reader.readShortString(30);
                var Comp2Name = reader.readShortString(30);
                reader.incOffset(2);  // Delphi offset
                var CompCode1 = reader.readInteger();
                var CompCode2 = reader.readInteger();
                for (var i=1; i<=res.TotNr; i++) {
                    res.RIntervs[i] = {};
                    res.RIntervs[i].x1 = reader.readInteger();
                    res.RIntervs[i].x2 = reader.readInteger();
                    res.RIntervs[i].Cind = reader.readSmallInt();
                    reader.incOffset(2);  // Delphi offset
                    if (res.RIntervs[i].Cind == 2) {
                        res.RIntervs[i].CompName = Comp2Name;
                        res.RIntervs[i].CompCode = CompCode2;
                    }
                    else {
                        res.RIntervs[i].CompName = Comp1Name;
                        res.RIntervs[i].CompCode = CompCode1;
                    }
                }
                reader.incOffset((100-res.TotNr)*12);
            }
        }
        else {    // not tested
            res.NrDiffComps = 1;
            for (var i=1; i<=res.TotNr; i++) {
                res.RIntervs[i] = {};
                res.RIntervs[i].x1 = reader.readInteger();
                res.RIntervs[i].x2 = reader.readInteger();
                res.RIntervs[i].Cind = res.iRemanComp;
            }
        }
        
        return res;
    }
    
    function readShopInfo(reader) {
        var res = {};
        
        res.x1 = reader.readInteger();
        res.x2 = reader.readInteger();
        res.ScaledArea = reader.readDouble();
        res.YieldNo1 = reader.readDouble();
        res.YieldNo2 = reader.readDouble();
        res.YieldNo3 = reader.readDouble();
        res.NSC = reader.readInteger();
        reader.incOffset(4);  // Delphi offset
        res.ShopComps = [];
        for (var i=1; i<=res.NSC; i++) {
            res.ShopComps[i] = {};
            res.ShopComps[i].xLpix  = reader.readInteger();
            res.ShopComps[i].yTpix  = reader.readInteger();
            res.ShopComps[i].widpix = reader.readInteger();
            res.ShopComps[i].lenpix = reader.readInteger();
            res.ShopComps[i].xL     = reader.readInteger();
            res.ShopComps[i].yT     = reader.readInteger();
            res.ShopComps[i].width  = reader.readInteger();
            res.ShopComps[i].length = reader.readInteger();
            res.ShopComps[i].NomWidth  = reader.readDouble();
            res.ShopComps[i].NomLength = reader.readDouble();
            res.ShopComps[i].CompName  = reader.readShortString(12);
            res.ShopComps[i].Qual = reader.readByte();
            reader.incOffset(3);  // Vacant
            reader.incOffset(7);  // Delphi offset
        }
        reader.incOffset((20-res.NSC)*72);
        
        return res;
    }
    
    function ReadOneQIntervs(reader) {
        var res = {};
        
        res.ivNr = reader.readInteger();
        res.Intervs = [];
        for (var i=1; i<=res.ivNr; i++) {
            res.Intervs[i] = {};
            res.Intervs[i].x1 = reader.readSmallInt();
            res.Intervs[i].x2 = reader.readSmallInt();
        }
        res.Overlap = reader.readBoolean();
        
        return res;
    }
    
    function ReadQI6(reader) {
        var res = {};
        
        res.Face1  = ReadOneQIntervs(reader);
        res.Face2  = ReadOneQIntervs(reader);
        res.Front1 = ReadOneQIntervs(reader);
        res.Rear1  = ReadOneQIntervs(reader);
        res.Front2 = ReadOneQIntervs(reader);
        res.Rear2  = ReadOneQIntervs(reader);
        
        return res;
    }
    
    function CopyToQI6(source) {
        var res = {};
        
        res.Face1  = source;
        res.Face2  = source;
        res.Front1 = source;
        res.Rear1  = source;
        res.Front2 = source;
        res.Rear2  = source;
        
        return res;
    }
    
    function readQFI(reader, RevNr) {
        var res = {};
        
        res.ExtReasons = 0;
        if (RevNr > 89)
            res.ExtReasons = reader.readInteger();
        else if (RevNr > 49)
            res.ExtReasons = reader.readWord();
        else if (RevNr > 38)
            res.ExtReasons = reader.readByte();
        
        res.XLim = ReadOneQIntervs(reader);
        res.LowW = ReadOneQIntervs(reader);
        res.HiW  = ReadOneQIntervs(reader);
        
        res.WaneWiF   = ReadOneQIntervs(reader);
        res.WaneWiR   = ReadOneQIntervs(reader);
        res.Wane2S    = ReadOneQIntervs(reader);
        res.WaneDpF   = ReadOneQIntervs(reader);
        res.WaneDpR   = ReadOneQIntervs(reader);
        res.WaneLenF  = ReadOneQIntervs(reader);
        res.WaneLenR  = ReadOneQIntervs(reader);
        res.WaneLen2S = ReadOneQIntervs(reader);
        res.SSLen     = ReadOneQIntervs(reader);
        
        if ((RevNr > 523) || ((RevNr < 500) && (RevNr > 135))) {
            res.KntDmSound = ReadQI6(reader);
            res.KntDmDead  = ReadQI6(reader);
            res.KntDmBark  = ReadQI6(reader);
        }
        else {
            res.KntDmSound = CopyToQI6(res.XLim);
            res.KntDmDead  = CopyToQI6(res.XLim);
            res.KntDmBark  = CopyToQI6(res.XLim);
        }
        res.KntDm         = ReadQI6(reader);
        res.KntOS         = ReadQI6(reader);
        res.KntSumAll     = ReadQI6(reader);
        res.KntSumDead    = ReadQI6(reader);
        res.KntSumUnsound = ReadQI6(reader);
        res.KntSumHole    = ReadQI6(reader);
        res.KntSumMaxNr   = ReadQI6(reader);
        
        res.PitchDm  = ReadQI6(reader);
        res.PitchSum = ReadQI6(reader);
        
        res.BarkDm  = ReadQI6(reader);
        res.BarkSum = ReadQI6(reader);
        
        res.Split1   = ReadOneQIntervs(reader);
        res.Split2   = ReadOneQIntervs(reader);
        if (RevNr > 66)
            res.ShakeSlope = ReadOneQIntervs(reader);
        else
            res.ShakeSlope = res.XLim;
        if ((RevNr > 519) || ((RevNr < 500) && (RevNr > 132))) {
            res.EndSplit1 = ReadOneQIntervs(reader);
            res.EndSplit2 = ReadOneQIntervs(reader);
            res.EdgeShakesOnFace1 = ReadOneQIntervs(reader);
            res.EdgeShakesOnFace2 = ReadOneQIntervs(reader);
        }
        else {
            res.EndSplit1 = res.Split1;
            res.EndSplit2 = res.Split2;
            res.EdgeShakesOnFace1 = res.XLim;
            res.EdgeShakesOnFace2 = res.XLim;
        }
        
        res.BlueStain = ReadQI6(reader);
        if ((RevNr > 106) || (RevNr == 99) || (RevNr == 100)) {
            res.HeavyBluestain1 = ReadOneQIntervs(reader);
            res.HeavyBluestain2 = ReadOneQIntervs(reader);
        }
        else {
            res.HeavyBluestain1 = res.XLim;
            res.HeavyBluestain2 = res.XLim;
        }
        
        res.Rot = ReadQI6(reader);
        if ((RevNr > 513) || ((RevNr < 500) && (RevNr > 127))) {
            res.DarkRot1 = ReadOneQIntervs(reader);
            res.DarkRot2 = ReadOneQIntervs(reader);
        }
        else {
            res.DarkRot1 = res.XLim;
            res.DarkRot2 = res.XLim;
        }
        
        if (RevNr > 113)
            res.Mold = ReadQI6(reader);
        else
            res.Mold = CopyToQI6(res.XLim);
        if (RevNr > 37) {
            res.Speck    = ReadQI6(reader);
            res.Redstain = ReadQI6(reader);
        }
        else {
            res.Speck    = CopyToQI6(res.XLim);
            res.Redstain = CopyToQI6(res.XLim);
        }
        
        if (RevNr > 35)
            res.PinWorms = ReadOneQIntervs(reader);
        else
            res.PinWorms = res.XLim;
        
        if (RevNr > 33) {
            res.SkipW    = ReadOneQIntervs(reader);
            res.SkipT    = ReadOneQIntervs(reader);
            res.SkipRfns = ReadOneQIntervs(reader);
        }
        else {
            res.SkipW    = res.XLim;
            res.SkipT    = res.XLim;
            res.SkipRfns = res.XLim;
        }
        
        if (RevNr > 40) {
            res.SawStep1 = ReadOneQIntervs(reader);
            res.SawStep2 = ReadOneQIntervs(reader);
        }
        else {
            res.SawStep1 = res.XLim;
            res.SawStep2 = res.XLim;
        }
        
        res.Bow   = ReadOneQIntervs(reader);
        res.Crook = ReadOneQIntervs(reader);
        res.Twist = ReadOneQIntervs(reader);
        
        if (RevNr > 45) {
            res.MachineBite  = ReadOneQIntervs(reader);
            res.SlopeOfGrain = ReadOneQIntervs(reader);
        }
        else {
            res.MachineBite  = res.XLim;
            res.SlopeOfGrain = res.XLim;
        }
        
        if (RevNr > 47) {
            res.LowTh = ReadOneQIntervs(reader);
            res.HiTh  = ReadOneQIntervs(reader);
        }
        else {
            res.LowTh = res.XLim;
            res.HiTh  = res.XLim;
        }
        
        if (RevNr > 57) {
            res.Sawcut   = ReadOneQIntervs(reader);
            res.DecayEnd = ReadOneQIntervs(reader);
        }
        else {
            res.Sawcut   = res.XLim;
            res.DecayEnd = res.XLim;
        }
        
        if (RevNr > 60) {
            res.MSR          = ReadOneQIntervs(reader);
            res.MoistContent = ReadOneQIntervs(reader);
        }
        else {
            res.MSR          = res.XLim;
            res.MoistContent = res.XLim;
        }
        
        if (RevNr > 83) {
            res.KntEndZone = ReadOneQIntervs(reader);
            res.KntSKR     = ReadOneQIntervs(reader);
        }
        else {
            res.KntEndZone = res.XLim;
            res.KntSKR     = res.XLim;
        }
        
        if (RevNr > 84)
            res.MinAltQ = ReadOneQIntervs(reader);
        else
            res.MinAltQ = res.XLim;
        
        if (RevNr > 88)
            res.SapwDecay = ReadOneQIntervs(reader);
        else
            res.SapwDecay = res.XLim;
        
        if (RevNr > 109)
            res.Pith = ReadOneQIntervs(reader);
        else
            res.Pith = res.XLim;
        
        if ((RevNr > 508) || ((RevNr < 500) && (RevNr > 122)))
            res.Freckles = ReadQI6(reader);
        else
            res.Freckles = CopyToQI6(res.XLim);
        
        if ((RevNr > 500) || ((RevNr < 500) && (RevNr > 116))) {
            res.OSWaneWiF = ReadOneQIntervs(reader);
            res.OSWaneWiR = ReadOneQIntervs(reader);
            res.OSWaneW2S = ReadOneQIntervs(reader);
            res.OSWaneDpF = ReadOneQIntervs(reader);
            res.OSWaneDpR = ReadOneQIntervs(reader);
        }
        else {
            res.OSWaneWiF = {};  res.OSWaneWiF.ivNr = 0;
            res.OSWaneWiR = {};  res.OSWaneWiR.ivNr = 0;
            res.OSWaneW2S = {};  res.OSWaneW2S.ivNr = 0;
            res.OSWaneDpF = {};  res.OSWaneDpF.ivNr = 0;
            res.OSWaneDpR = {};  res.OSWaneDpR.ivNr = 0;
        }
        
        if ((RevNr > 509) || ((RevNr < 500) && (RevNr > 123))) {
            res.OSLowW  = ReadOneQIntervs(reader);
            res.OSHiW   = ReadOneQIntervs(reader);
            res.OSLowTh = ReadOneQIntervs(reader);
            res.OSHiTh  = ReadOneQIntervs(reader);
        }
        else {
            res.OSLowW  = {};  res.OSLowW.ivNr  = 0;
            res.OSHiW   = {};  res.OSHiW.ivNr   = 0;
            res.OSLowTh = {};  res.OSLowTh.ivNr = 0;
            res.OSHiTh  = {};  res.OSHiTh.ivNr  = 0;
        }
        
        if ((RevNr > 515) || ((RevNr < 500) && (RevNr > 129)))
            res.EndSpy = ReadOneQIntervs(reader);
        else
            res.EndSpy = res.XLim;
        
        if ((RevNr > 518) || ((RevNr < 500) && (RevNr > 130)))
            res.TopBreak = ReadOneQIntervs(reader);
        else
            res.TopBreak = res.XLim;
        
        return res;
    }
    
    function ReadOneOptSolution(reader, RevNr) {
        var res = {};
        
        res.SolType = reader.readByte();
        res.TotVal  = reader.readDouble();
        res.LumberVal = reader.readDouble();
        res.ChipVal = reader.readDouble();
        res.DU = 0;
        if (RevNr > 30)
            res.DU = reader.readByte();
        
        res.RemanSol = enumRemanSol.rsNormal;
        res.iRemanQ = 0;
        res.iRemanComp = 0;
        if (RevNr > 42) {
            res.RemanSol = reader.readByte();
            res.iRemanQ = reader.readInteger();
            res.iRemanComp = reader.readInteger();
            
            var rsShop = false;
            if (RevNr > 80)
                rsShop = reader.readByte();
            if (!rsShop) {
                res.RInfo = readRInfo(reader, RevNr);
            }
            else {
                res.ShopInfo = readShopInfo(reader);
            }
        }
        
        res.iT  = reader.readInteger();
        res.iW  = reader.readInteger();
        res.iQ  = reader.readInteger();
        res.iSC = reader.readInteger();
        res.iProd = reader.readInteger();
        
        res.xcut1 = reader.readInteger();
        res.xcut2 = reader.readInteger();
        res.xmod1 = reader.readInteger();
        res.xmod2 = reader.readInteger();
        res.Add1  = reader.readInteger();
        res.Add2  = reader.readInteger();
        
        if (RevNr > 34) {
            res._xcut1  = reader.readSingle();
            res._xcut2  = reader.readSingle();
            res._xmod1  = reader.readSingle();
            res._xmod2  = reader.readSingle();
            res._Add1   = reader.readSingle();
            res._Add2   = reader.readSingle();
            res._ModLen = reader.readSingle();
        }
        
        if (RevNr > 38) {
            res.Cut1Reason = reader.readByte();
            res.Cut2Reason = reader.readByte();
            res.RejectReason = reader.readByte();
            
            if (RevNr > 46) {
                reader.incOffset(2);  // DG_CutReasons
                res.DG_RejectReason = reader.readByte();
            }
            
            res.SolLen  = reader.readInteger();
            res._SolLen = reader.readSingle();
            
            if (RevNr > 94) {
                res.indL = reader.readInteger();
            }
        }
        
        if (RevNr < 51)
            res.OptFlags = reader.readByte();
        else if (RevNr < 68)
            res.OptFlags = reader.readWord();
        else
            res.OptFlags = reader.readInteger();
        res.OptFlags2 = 0;
        if (((RevNr >= 97) && (RevNr <= 100)) || (RevNr > 102))
            res.OptFlags2 = reader.readInteger();
        if ((RevNr < 128) && 
             ((res.SolType == enumSolType.solTrim) ||
              (res.SolType == enumSolType.solEdging) ||
              (res.SolType == enumSolType.solUpsideDown))) {
            res.OptFlags2 = includeInSet(res.OptFlags2, enumOptSettings2.opt2_FromEdger);
            res.OptFlags2 = includeInSet(res.OptFlags2, enumOptSettings2.opt2_1ScanDirs);
        }
        
        res.Displc = 0;
        if (RevNr > 69)
            res.Displc = reader.readInteger();
        
        res.RawW = 0;
        if (RevNr > 70)
            res.RawW = reader.readDouble();
        
        res.indQSA1 = 0;
        res.indQSA2 = 0;
        res.indQSA3 = 0;
        res.GradingIntvs = 0;
        if (RevNr > 72) {
            res.GradingIntvs = reader.readUInt64();  // risky?
            if (RevNr > 82) {
                res.indQSA1 = reader.readInteger();
                res.indQSA2 = reader.readInteger();
                if (RevNr > 87) {
                    res.indQSA3 = reader.readInteger();
                    res.indQSA4 = reader.readInteger();
                    reader.incOffset(4*4);  // vacant
                }
                else {
                    reader.incOffset(6*4);  // vacant
                }
            }
            else {
                reader.incOffset(8*4);  // vacant
            }
        }
        
        res.QFI = readQFI(reader, RevNr);
        
        return res;
    }
    
    function FindSliceNum(x, Geom, StartSlice = 1) {
        StartSlice = Math.max(1,StartSlice);
        var ip = StartSlice;
        while ((ip < Geom.length) && (Geom[ip].x < x))
            ip++;
            
        if (ip > StartSlice)
            return ip-1;
        else
            return StartSlice;
    }
    
    function SetFirstAndLastDefectSlices(extDefInfos, defectA, geom) {
        for (var i=1; i<extDefInfos.length; i++) {
            extDefInfos[i].FirstSlc = FindSliceNum(defectA[i].X1, geom);
            extDefInfos[i].LastSlc  = FindSliceNum(defectA[i].X2, geom, extDefInfos[i].FirstSlc);
        }
        return extDefInfos;
    }
    
    function readThickRec(reader, RevNr, HasEdgingSol) {
        var res = {};
        
        res.ThName   = reader.readShortString(25);
        reader.incOffset(6);  // Delphi offset
        res.NomTh    = reader.readDouble();
        res.RawTh    = reader.readDouble();
        res.RjctLow  = reader.readDouble();
        res.RjctUp   = reader.readDouble();
        res.AlarmLow = reader.readDouble();
        res.AlarmUp  = reader.readDouble();
        if ((RevNr < 73) && HasEdgingSol) {     // fix to read Edger files (cannot read rejects)
            //res.ExtIndex = reader.readInteger();
            reader.incOffset(4);
            reader.incOffset(4);  // Delphi offset
        }
        if (RevNr > 100)
            //res.MaxLowVar = reader.readDouble();
            //res.MaxLowVarLen = reader.readDouble();
            //res.MaxHighVar = reader.readDouble();
            //res.MaxHighVarLen = reader.readDouble();
            reader.incOffset(32);
        if (((RevNr < 500) && (RevNr > 124)) || (RevNr > 510))
            //res.LowOSEndZoneLen = reader.readDouble();
            //res.HighOSEndZoneLen = reader.readDouble();
            reader.incOffset(16);
        if (((RevNr < 500) && (RevNr > 125)) || (RevNr > 511)) {
            //res.ExtIndex = reader.readInteger();
            reader.incOffset(4);
            reader.incOffset(4);  // Delphi offset
        }
        if (((RevNr < 500) && (RevNr > 133)) || (RevNr > 520))
            //res.ModuleTh = reader.readDouble();
            reader.incOffset(8);
            
        return res;
    }
    
    function readWidthRec(reader, RevNr, HasEdgingSol) {
        var res = {};
        
        res.WdName   = reader.readShortString(25);
        reader.incOffset(6);  // Delphi offset
        res.NomW     = reader.readDouble();
        res.RawW     = reader.readDouble();
        res.RjctLow  = reader.readDouble();
        res.RjctUp   = reader.readDouble();
        res.AlarmLow = reader.readDouble();
        res.AlarmUp  = reader.readDouble();
        if ((RevNr < 73) && HasEdgingSol) {     // fix to read Edger files (cannot read rejects)
            //res.ExtIndex = reader.readInteger();
            reader.incOffset(4);
            reader.incOffset(4);  // Delphi offset
        }
        if (RevNr > 100)
            //res.MaxLowVar = reader.readDouble();
            //res.MaxLowVarLen = reader.readDouble();
            //res.MaxHighVar = reader.readDouble();
            //res.MaxHighVarLen = reader.readDouble();
            reader.incOffset(32);
        if (((RevNr < 500) && (RevNr > 124)) || (RevNr > 510))
            //res.LowOSEndZoneLen = reader.readDouble();
            //res.HighOSEndZoneLen = reader.readDouble();
            reader.incOffset(16);
        if (((RevNr < 500) && (RevNr > 125)) || (RevNr > 511)) {
            //res.ExtIndex = reader.readInteger();
            reader.incOffset(4);
            reader.incOffset(4);  // Delphi offset
        }
        if (((RevNr < 500) && (RevNr > 133)) || (RevNr > 520))
            //res.ModuleWd = reader.readDouble();
            reader.incOffset(8);
            
        return res;
    }
    
    function readGradeRec(reader, RevNr) {
        var res = {};
        
        res.Name = reader.readShortString(25);
        res.ShortName = reader.readShortString(8);
        
        if ((RevNr > 517) || ((RevNr < 500) && (RevNr > 137)))
            reader.incOffset(45);
        else if (RevNr > 120)
            reader.incOffset(21);
        else if (RevNr > 86)
            reader.incOffset(17);
        else if (RevNr > 82)
            reader.incOffset(15);
        else if (RevNr > 68)
            reader.incOffset(13);
        else if (RevNr > 42)
            reader.incOffset(13);
        else
            reader.incOffset(9);
        
        return res;
    }
    
    function readStrip(reader) {
        var res = {};
        
        res.y1 = {};
        res.y1.y       = reader.readDouble();
        res.y1.edge    = reader.readInteger();
        res.y1.has_cut = reader.readBoolean();
        reader.incOffset(3);  // Delphi offset
        res.y2 = {};
        res.y2.y       = reader.readDouble();
        res.y2.edge    = reader.readInteger();
        res.y2.has_cut = reader.readBoolean();
        reader.incOffset(3);  // Delphi offset
        
        res.nStripSolutions = reader.readInteger();
        if (res.nStripSolutions > 16)
            res.nStripSolutions = 16;
        reader.incOffset(4);  // Delphi offset

        res.StripSolutions = [];
        for (var i=1; i<=res.nStripSolutions; i++) {
            res.StripSolutions[i] = {};
            res.StripSolutions[i].SolType = reader.readByte();
            reader.incOffset(7);  // Delphi offset
            res.StripSolutions[i].TotVal  = reader.readDouble();
            res.StripSolutions[i].LumberVal = reader.readDouble();
            res.StripSolutions[i].ChipVal = reader.readDouble();
            res.StripSolutions[i].DU = reader.readByte();
            reader.incOffset(3);  // Delphi offset
            
            res.StripSolutions[i].iT = reader.readInteger();
            res.StripSolutions[i].iW = reader.readInteger();
            res.StripSolutions[i].iQ = reader.readInteger();
            res.StripSolutions[i].iSC = reader.readInteger();
            res.StripSolutions[i].iProd = reader.readInteger();
            res.StripSolutions[i].RawW = reader.readDouble();
            
            res.StripSolutions[i].xcut1 = reader.readInteger();
            res.StripSolutions[i].xcut2 = reader.readInteger();
            res.StripSolutions[i].xmod1 = reader.readInteger();
            res.StripSolutions[i].xmod2 = reader.readInteger();
            res.StripSolutions[i].Add1  = reader.readInteger();
            res.StripSolutions[i].Add2  = reader.readInteger();
            res.StripSolutions[i].SolLen = reader.readInteger();
            
            res.StripSolutions[i]._xcut1  = reader.readSingle();
            res.StripSolutions[i]._xcut2  = reader.readSingle();
            res.StripSolutions[i]._xmod1  = reader.readSingle();
            res.StripSolutions[i]._xmod2  = reader.readSingle();
            res.StripSolutions[i]._Add1   = reader.readSingle();
            res.StripSolutions[i]._Add2   = reader.readSingle();
            res.StripSolutions[i]._ModLen = reader.readSingle();
            res.StripSolutions[i]._SolLen = reader.readSingle();  // ok
            
            res.StripSolutions[i].OptFlags = reader.readByte();   // not ok?
            reader.incOffset(3);  // Delphi offset
            reader.incOffset(1);  // EdgeOrder                    // ok
            res.StripSolutions[i].Cut1Reason = reader.readByte();
            res.StripSolutions[i].Cut2Reason = reader.readByte();
            reader.incOffset(2);  // CutLReason, CutRReason
            res.StripSolutions[i].RejectReason = reader.readByte();
                
            reader.incOffset(3);   // DG_CutReasons, DG_RejectReason
            reader.incOffset(1);   // ReoptSol
            reader.incOffset(2);   // offset
            reader.incOffset(16);  // Reopt
            res.StripSolutions[i].Displc = reader.readInteger();
            res.StripSolutions[i].protocol_version = reader.readInteger();
            reader.incOffset(4);  // offset
        }
        reader.incOffset((16-res.nStripSolutions)*168);
        
        return res;
    }
    
    function readEdgSol(reader) {
        var res = {};
        
        res.SolType   = reader.readByte();
        reader.incOffset(7);  // Delphi offset
        res.TotVal    = reader.readDouble();
        res.LumberVal = reader.readDouble();
        res.ChipVal   = reader.readDouble();
        res.Angle     = reader.readDouble();
        res.ypos      = reader.readDouble();
        res.RejectReason = reader.readByte();
        reader.incOffset(7);  // Delphi offset
        res.Strips = [];
        for (var i=1; i<=16; i++) {
            res.Strips[i] = readStrip(reader);
        }
        res.nStrips   = reader.readInteger();
        reader.incOffset(4);  // Delphi offset
        res.ExecutionTime = reader.readDouble();
        res.nrPosArms = reader.readInteger();
        res.PosArms = readPosArms(reader);

        res.DoTrimBeforeEdging = reader.readBoolean();
        reader.incOffset(3);  // Delphi offset
        res.XMaxCoord = reader.readInteger();
        res.TrimPos1  = reader.readInteger();
        res.TrimPos2  = reader.readInteger();
        res.xoffset   = reader.readInteger();
        
        return res;
    }

    function ReadBRES32Data(buffer, reader, Revision) {
        var res = {};
        
        res.RevNr = Revision;
        res.RStatus = reader.readByte();
        res.RNr = reader.readInteger();

        res.ResultHeader = ReadResultHeader(reader, Revision);

        var MHdrSize = reader.readInteger();    // Size : 312 (rev.22-41), 336 (rev.42-99), 840 (-104), 968 (105-132...)
//        var r2 = new DelphiByteStreamReader(buffer, reader.getOffset(), MHdrSize);  // use this to avoid reading too much
//        var res.Header = readMainHeader(r2);
        reader.incOffset(MHdrSize);

        res.Board = ReadOptBoardRecFileStream(buffer, reader, Revision, MHdrSize);
        
        if (Revision < 56) {
            var ManuGrade = res.Board.Header.ManualGrade % 1000;
            var Mode = Math.floor(res.Board.Header.ManualGrade / 1000);
            res.Board.Header.ManualGrade = Mode*100000 + ManuGrade;
        }
        var BInfoSize = reader.readInteger();
        reader.incOffset(BInfoSize);
        
        var BDSize = reader.readInteger();
        var r2 = new DelphiByteStreamReader(buffer, reader.getOffset(), BDSize);  // use this to avoid reading too much/little
        res.BD = readBD(r2, Revision);
        reader.incOffset(BDSize);
        
        if (Revision < 82) {
            res.Board.UExtDefInfos = SetFirstAndLastDefectSlices(res.Board.UExtDefInfos, res.Board.UDefect, res.Board.Geom);
            res.Board.DExtDefInfos = SetFirstAndLastDefectSlices(res.Board.DExtDefInfos, res.Board.DDefect, res.Board.Geom);
            res.Board.FExtDefInfos = SetFirstAndLastDefectSlices(res.Board.FExtDefInfos, res.Board.FDefect, res.Board.Geom);
            res.Board.RExtDefInfos = SetFirstAndLastDefectSlices(res.Board.RExtDefInfos, res.Board.RDefect, res.Board.Geom);
        }
        
        res.GrdSol = [];
        var numOfSols = res.BD.NrTWQ;
        if ((Revision > 503) || ((Revision < 500) && (Revision > 118))) {
            numOfSols = Math.max(1,res.BD.NrTWQ);    // includes dimension reject
        }
        var HasEdgingSol = false;
        for (var i=1; i<=numOfSols; i++) {
            res.GrdSol[i] = ReadOneOptSolution(reader, Revision);
            if ((res.GrdSol[i].SolType == enumSolType.solTrim) ||
                (res.GrdSol[i].SolType == enumSolType.solEdging) ||
                (res.GrdSol[i].SolType == enumSolType.solUpsideDown))
                HasEdgingSol = true;
            
            if (Revision < 73) {
                if (res.GrdSol[i].DU == enumDimUnit.duInch) {
                    res.GrdSol[i].GradingIntvs = includeInSet(res.GrdSol[i].GradingIntvs, enumGradingInterval.griXLim_Dim);
                    res.GrdSol[i].GradingIntvs = includeInSet(res.GrdSol[i].GradingIntvs, enumGradingInterval.griXLim_Skip);
                    res.GrdSol[i].GradingIntvs = includeInSet(res.GrdSol[i].GradingIntvs, enumGradingInterval.griXLim_MSR);
                    res.GrdSol[i].GradingIntvs = includeInSet(res.GrdSol[i].GradingIntvs, enumGradingInterval.griXLim_MC);
                    res.GrdSol[i].GradingIntvs = includeInSet(res.GrdSol[i].GradingIntvs, enumGradingInterval.griWane_NA);
                    res.GrdSol[i].GradingIntvs = includeInSet(res.GrdSol[i].GradingIntvs, enumGradingInterval.griKnot_NAdim);
                    res.GrdSol[i].GradingIntvs = includeInSet(res.GrdSol[i].GradingIntvs, enumGradingInterval.griPitch);
                    res.GrdSol[i].GradingIntvs = includeInSet(res.GrdSol[i].GradingIntvs, enumGradingInterval.griBark);
                    res.GrdSol[i].GradingIntvs = includeInSet(res.GrdSol[i].GradingIntvs, enumGradingInterval.griSplit);
                    res.GrdSol[i].GradingIntvs = includeInSet(res.GrdSol[i].GradingIntvs, enumGradingInterval.griShakeSlope);
                    res.GrdSol[i].GradingIntvs = includeInSet(res.GrdSol[i].GradingIntvs, enumGradingInterval.griBluestainFace);
                    res.GrdSol[i].GradingIntvs = includeInSet(res.GrdSol[i].GradingIntvs, enumGradingInterval.griBluestainEdge);
                    res.GrdSol[i].GradingIntvs = includeInSet(res.GrdSol[i].GradingIntvs, enumGradingInterval.griRedstainFace);
                    res.GrdSol[i].GradingIntvs = includeInSet(res.GrdSol[i].GradingIntvs, enumGradingInterval.griRedstainEdge);
                    res.GrdSol[i].GradingIntvs = includeInSet(res.GrdSol[i].GradingIntvs, enumGradingInterval.griRotFace);
                    res.GrdSol[i].GradingIntvs = includeInSet(res.GrdSol[i].GradingIntvs, enumGradingInterval.griRotEdge);
                    res.GrdSol[i].GradingIntvs = includeInSet(res.GrdSol[i].GradingIntvs, enumGradingInterval.griEndRot);
                    res.GrdSol[i].GradingIntvs = includeInSet(res.GrdSol[i].GradingIntvs, enumGradingInterval.griSpeckFace);
                    res.GrdSol[i].GradingIntvs = includeInSet(res.GrdSol[i].GradingIntvs, enumGradingInterval.griSpeckEdge);
                    res.GrdSol[i].GradingIntvs = includeInSet(res.GrdSol[i].GradingIntvs, enumGradingInterval.griPinWorms);
                    res.GrdSol[i].GradingIntvs = includeInSet(res.GrdSol[i].GradingIntvs, enumGradingInterval.griSlopeGrain);
                    res.GrdSol[i].GradingIntvs = includeInSet(res.GrdSol[i].GradingIntvs, enumGradingInterval.griMachineBite);
                    res.GrdSol[i].GradingIntvs = includeInSet(res.GrdSol[i].GradingIntvs, enumGradingInterval.griSawcut);
                    res.GrdSol[i].GradingIntvs = includeInSet(res.GrdSol[i].GradingIntvs, enumGradingInterval.griWarp);
                }
                else {
                    res.GrdSol[i].GradingIntvs = includeInSet(res.GrdSol[i].GradingIntvs, enumGradingInterval.griXLim_Dim);
                    res.GrdSol[i].GradingIntvs = includeInSet(res.GrdSol[i].GradingIntvs, enumGradingInterval.griWane_Scand);
                    res.GrdSol[i].GradingIntvs = includeInSet(res.GrdSol[i].GradingIntvs, enumGradingInterval.griKnot_Scand);
                    res.GrdSol[i].GradingIntvs = includeInSet(res.GrdSol[i].GradingIntvs, enumGradingInterval.griPitch);
                    res.GrdSol[i].GradingIntvs = includeInSet(res.GrdSol[i].GradingIntvs, enumGradingInterval.griBark);
                    res.GrdSol[i].GradingIntvs = includeInSet(res.GrdSol[i].GradingIntvs, enumGradingInterval.griSplit);
                    res.GrdSol[i].GradingIntvs = includeInSet(res.GrdSol[i].GradingIntvs, enumGradingInterval.griBluestainFace);
                    res.GrdSol[i].GradingIntvs = includeInSet(res.GrdSol[i].GradingIntvs, enumGradingInterval.griRotFace);
                    res.GrdSol[i].GradingIntvs = includeInSet(res.GrdSol[i].GradingIntvs, enumGradingInterval.griWarp);
                }
            }
        }

        var grdIndLen = 24;
        if (Revision > 85)
            grdIndLen = 150;
        else if (Revision > 64)
            grdIndLen = 125;
        else if (Revision > 61)
            grdIndLen = 100;
        else if (Revision > 54)
            grdIndLen = 80;
        else if (Revision > 53)
            grdIndLen = 48;
        else if (Revision > 51)
            grdIndLen = 32;
        res.GrdInd = [];
        for (var i=1; i<=grdIndLen; i++) {
            res.GrdInd[i] = reader.readInteger();
        }
        
        reader.readShortString();  // Memo
        
        // Thickness rules
        
        res.NrT = reader.readInteger();
        res.Thickns = [];
        for (var i=1; i<=res.NrT; i++) {
            res.Thickns[i] = readThickRec(reader, Revision, HasEdgingSol);
        }
        
        // Width rules
        
        res.NrW = reader.readInteger();
        res.Widths = [];
        for (var i=1; i<=res.NrW; i++) {
            res.Widths[i] = readWidthRec(reader, Revision, HasEdgingSol);
        }
        
        // Grades
        
        res.NrQ = reader.readInteger();
        res.Grades = [];
        for (var i=1; i<=res.NrQ; i++) {
            res.Grades[i] = readGradeRec(reader, Revision);
        }
        
        if (Revision < 71) {
            for (var i=1; i<=res.BD.NrTWQ; i++) {
                res.GrdSol[i].RawW = res.Widths[res.GrdSol[i].iW].RawW;
            }
        }
        
        // Edger solution 
        
        res.EdgSol = {};
        if ((Revision > 511) || (Revision <= 100) || ((Revision < 500) && (Revision > 125))) {
            var edgSolSize = 0;
            try {
                edgSolSize = reader.readInteger();
            }
            catch {
                // XP versions may be Edgers or not
            }
            if (edgSolSize > 0) {
                var r3 = new DelphiByteStreamReader(buffer, reader.getOffset(), edgSolSize);  // use this to avoid reading too much/little
                res.EdgSol = readEdgSol(r3);
                reader.incOffset(edgSolSize);
            }
        }
        
        return res;
    }
    
    // -------------------------------------------------------------------------
    // Public methods
    // -------------------------------------------------------------------------
    BresReader.prototype.readBres = function(buffer) {
        var reader = new DelphiByteStreamReader(buffer);
        
        var Revision = ReadInitialFileInfo(reader);
        if (Revision > 110) {
            var batchInfo = ReadBatchInfo(reader);
        }

        var res = {};
        if (Revision > 33) {
            res = ReadBRES32Data(buffer, reader, Revision);
            if (Revision > 110) {
                res.BatchInfo = batchInfo;
            }
            res.MainHeader = res.Board.Header;

        }
        else if (Revision > 20) {
            res.Board = ReadOptBoardRecFileStream(buffer, reader, Revision, 0);
            // ... rest is not implemented
        }
        
        return res;
    }
    
    return BresReader;
})();
