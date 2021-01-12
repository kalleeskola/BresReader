"use strict";

// ---------------------------------------------------------------------
// Returns true if given enumeration value exits in given set value
// ---------------------------------------------------------------------
function isInSet(setValue, enumValue) {
    if (((1 << enumValue) & setValue) > 0)
        return true;
    else
        return false;
}

// ---------------------------------------------------------------------
// Adds given enumeration value to given set and returns new set value
// ---------------------------------------------------------------------
function includeInSet(setValue, enumValue) {
    return ((1 << enumValue) | setValue);
}

var enumBFace = {
    faceUp: 0,
    faceDown: 1,
    faceFront: 2,
    faceRear: 3
};

var enumDimUnit = {
    duMM: 0,
    duInch: 1
};

var enumSolType = {
    solReject: 0,
    solNormal: 1,
    solTrim: 2,
    solEdging: 3,
    solUpsideDown: 4
};

var enumBoardType = {
    RootLeft: 0,
    RootRight: 1,
    WaneUp: 2,
    WaneDown: 3,
    NoWane: 4,
    SplintUp: 5,
    SplintDown: 6,
    KantB: 7,
    DelnB: 8,
    MasterHEB: 9,
    SlaveHEB: 10,
    UpsideDown: 11,
    StraightEnds: 12,
    InvDimensions: 13,
    WaneyBoard: 14
};

var enumOptSettings = {
    optNoTrim: 0,
    optNormal: 1,
    optHighEdgeBoard: 2,
    optDoubleBoard: 3,
    optWetBoard: 4,
    optTestBoard: 5,
    optForcedQ: 6,
    optReoptBoard: 7,
    optReEdging: 8,
    optCutInTwo: 9,
    optRevFace: 10,
    optNoMatch: 11,
    optPrimFace1: 12,
    optPrimFace2: 13,
    optCM_MarkCode: 14,
    optSecondSol: 15,
    optReprocessRun: 16,
    optDoubleOpt: 17,
    optKDsim: 18,
    optTrimBlockCut1: 19,
    optTrimBlockCut2: 20,
    optRipInTwo: 21,
    optCi2RejectA: 22,
    optCi2RejectB: 23,
    optMSR1: 24,
    optMSR2: 25,
    optRipInThree: 26,
    optTripleOpt: 27,
    optThirdSol: 28,
    optStrengthClass: 29,
    optAltClass: 30,
    optThReman: 31
};

var enumOptSettings2 = {
    opt2_EGPA: 0,
    opt2_ESAfterTrimmer: 1,
    opt2_MoistNone: 2,
    opt2_MoistSpyVal: 3,
    opt2_ESBetter: 4,
    opt2_ESWorse: 5,
    opt2_3ScanDirs: 6,
    opt2_1ScanDirs: 7,
    opt2_FromEdger: 8,
    opt2_RipInFour: 9,
    opt2_ReservedForRipInFive: 10,
    opt2_2ScanDirs: 11
};

var enumRejectType = {
    rjctNone: 0,               // No Reject                          0
    rjctNoThickness: 1,        //                                    1
    rjctNoWidth: 2,            // No T:  no W                        2
    rjctNoDimension: 3,        // No T  x W                          3
    rjctNoActiveDimension: 4,  // No active T x W                    4

    rjctExternal: 5,           //external                            5
    rjctXLim: 6,               //ManuQ and CutOffs (manual X limits) 6
    rjctLowW: 7,               //low width                           7
    rjctHiW: 8,                //high width                          8
    rjctWaneWiF: 9,            //wane width front                    9
    rjctWaneWiR: 10,           //wane width rear                     10
    rjctWaneWi2S: 11,          //wane width 2 sides                  11
    rjctWaneDpF: 12,           //wane depth front                    12
    rjctWaneDpR: 13,           //wane depth rear                     13
    rjctWaneLenF: 14,          //wane length front                   14
    rjctWaneLenR: 15,          //wane length rear                    15
    rjctWaneLen2S: 16,         //wane length 2 sides                 16
    rjctSSLen: 17,             //sawn surface length                 17
    rjctKntDm: 18,             //knot sizes (08/2019 only special knots in EU) 18
    rjctKntOS: 19,             //over-sized knots                    19
    rjctKntSumAll: 20,         //all knots                           20
    rjctKntSumDead: 21,        //sum of the dead knots               21
    rjctKntSumUnsound: 22,     //sum of the unsound knots            22
    rjctKntSumHole: 23,        //sum of the knot holes               23
    rjctKntSumMaxNr: 24,       //max nr of knots                     24
    rjctPitchDm: 25,           //pitch sizes                         25
    rjctPitchSum: 26,          //pitch sums                          26
    rjctBarkDm: 27,            //bark sizes                          27
    rjctBarkSum: 28,           //bark sums                           28
    rjctSplit1: 29,            //shake length, splint                29
    rjctSplit2: 30,            //shake length, märg                  30
    rjctBlueStain: 31,         //bluestain                           31
    rjctRot: 32,               //rots                                32
    rjctSpeck: 33,             //whitespeck, honeycomb               33
    rjctRedStain: 34,          //redstain                            34
    rjctPinWorms: 35,          //pinworms                            35
    rjctSkipW: 36,             //dimensional skip                    36
    rjctSkipT: 37,             //dimensional skip                    37
    rjctSkipRfns: 38,          //roughness skip                      38
    rjctSawStep1: 39,          //upperface saw step                  39
    rjctSawStep2: 40,          //bottomface saw step                 40
    rjctBow: 41,               //deformation                         41
    rjctCrook: 42,             //deformation                         42
    rjctTwist: 43,             //deformation                         43
    rjctMachineBite: 44,       //machine bite ADDED 14.10.2003       44
    rjctSlopeOfGrain: 45,      //slope of grain ADDED 29.10.2003     45

    rjctxrLength: 46,          //                                    46
    rjctxrManuGrade: 47,       //                                    47
    rjctxrTrimSawPos: 48,      //                                    48
    rjctxrCutOff1TooBig: 49,   //                                    49
    rjctxrCutOff2TooBig: 50,   //                                    50

    rjctxrHeartwood: 51,       // Heartwood content added 28.07.2004 51
    rjctxrMoisture: 52,        // Moisture content added 28.07.2004  52

    rjctxrRotBatch: 53,        // Rotten batch, added 12.08.2004     53
    rjctxrBlueBatch: 54,       // Blue batch,   added 12.08.2004     54

    rjctxrCrayon: 55,          // Crayon mark,  added 12.08.2004     55

    rjctxrRingDensity: 56,     // Ring density, added 04.09.2006     56

    rjctxrMSR: 57,             // MSR,          added 03.02.2007     57

    // QFI conversion  (EU -> NA)

    // Wane width    NA : -/-/max wane width
    // Wane depth    NA : max wane depth F/R
    // Wane length   NA : basic wane depth F/R:  basic wane width
    // Sawn surface length  NA : one edge wane & end zone wane

    rjctWaneNA_MaxWid: 58,     // = rjctWaneWi2S   (Max wane width)            58
    rjctWaneNA_MaxDpF: 59,     // = rjctWaneDpF    (Max wane depth front)      59
    rjctWaneNA_MaxDpR: 60,     // = rjctWaneDpR    (Max wane depth rear)       60
    rjctWaneNA_BscWid: 61,     // = rjctWaneLen2S  (Basic wane width)          61
    rjctWaneNA_BscDpF: 62,     // = rjctWaneLenF   (Basic wane depth front)    62
    rjctWaneNA_BscDpR: 63,     // = rjctWaneLenR   (Basic wane depth rear)     63
    rjctWaneNA_1Edg_End: 64,   // = rjctSSLen      (One edge wane or End wane) 64

    rjctKnotNA_EffSize: 65,    //                                    65
    rjctKnotNA_FrontSize: 66,  //                                    66
    rjctKnotNA_RearSize: 67,   //                                    67
    rjctKnotNA_XSection: 68,   //                                    68
    rjctKnotNA_SumAll: 69,     //                                    69
    rjctKnotNA_SumHole: 70,    //                                    70

    rjctSawcut: 71,            //                                    71

    rjctLowTh: 72,             // Added 14.05.2008                   72
    rjctHiTh: 73,              //                                    73
    rjctShakeSlope: 74,        // Shake slope                        74

    rjctAlternateGrade: 75,    // Added 23.10.2008                   75

    rjctSapwood: 76,           // Added 30.09.2009                   76

    rjctxrRingAveDist: 77,     // Modified 10.05.2010                77
    rjctxrRingMaxDist: 78,     // Modified 10.05.2010                78
    rjctxrRingSD: 79,          // Modified 10.05.2010                79
    rjctxrRingSummerWood: 80,  // Modified 10.05.2010                80

    rjctxrXLog: 81,            // Added 10.05.2010                   81     NOTE: cannot be DGreason !

    rjctPith: 82,              // Added 20.05.2013                   82

    rjctxrESRot: 83,           // Added 03.06.2013                   83
    rjctxrESBluestain: 84,     // Added 03.06.2013                   84

    rjctOther: 85,             //don't move!                         85
    rjctMold: 86,              //molds, added 12.02.2014             86
    rjctxrESShake: 87,
    rjctxrPLS: 88,             // Added 26.11.2014                   88
    rjctShopYield: 89,         // Added 13.03.2015
    rjctFreckles: 90,
    rjctNoAngle: 91,           // for edger
    rjctTimeout: 92,           //                                    92
    rjctxrESPith: 93,          //                                    93
    rjctTopBreak: 94,          //                                    94
    rjctEndSplit: 95,          //                                    95
    rjctKntDmSound: 96,        //                                    96
    rjctKntDmDead: 97,         //                                    97
    rjctKntDmBark: 98,         //                                    98
    rjctxrCup: 99              //                                    99
};

var enumCutOffType = {
    cutUndefined: 0,
    cutNone: 1,

    cutExternal: 2,
    cutXLim: 3,             // ManuQ and CutOffs (manual X limits)
    cutLowW: 4,             // low width
    cutHiW: 5,              // high width
    cutWaneWiF: 6,          // wane width front
    cutWaneWiR: 7,          // wane width rear
    cutWaneWi2S: 8,         // wane width 2 sides
    cutWaneDpF: 9,          // wane depth front
    cutWaneDpR: 10,         // wane depth rear
    cutWaneLenF: 11,        // wane length front
    cutWaneLenR: 12,        // wane length rear
    cutWaneLen2S: 13,       // wane length 2 sides
    cutSSLen: 14,           // sawn surface length
    cutKntDm: 15,           // knot sizes (08/2019 only special types in EU)
    cutKntOS: 16,           // over-sized knots
    cutKntSumAll: 17,       // all knots
    cutKntSumDead: 18,      // sum of the dead knots
    cutKntSumUnsound: 19,   // sum of the unsound knots
    cutKntSumHole: 20,      // sum of the knot holes
    cutKntSumMaxNr: 21,     // max nr of knots
    cutPitchDm: 22,         // pitch sizes
    cutPitchSum: 23,        // pitch sums
    cutBarkDm: 24,          // bark sizes
    cutBarkSum: 25,         // bark sums
    cutSplit1: 26,          // upperface splits
    cutSplit2: 27,          // bottomface splits
    cutBlueStain: 28,       // bluestain
    cutRot: 29,             // rots
    cutSpeck: 30,           // whitespeck, honeycomb
    cutRedStain: 31,        // redstain
    cutPinWorms: 32,        // pinworms
    cutSkipW: 33,           // dimensional skip
    cutSkipT: 34,           // dimensional skip
    cutSkipRfns: 35,        // roughness skip
    cutSawStep1: 36,        // upperface saw step
    cutSawStep2: 37,        // bottomface saw step
    cutBow: 38,             // deformation
    cutCrook: 39,           // deformation
    cutTwist: 40,           // deformation
    cutMachineBite: 41,     // machine bite ADDED 14.10.2003
    cutSlopeOfGrain: 42,    // slope of grain ADDED 29.10.2003

    cutWaneNA_MaxWid: 43,   // = cutWaneWi2S   (Max wane width)
    cutWaneNA_MaxDpF: 44,   // = cutWaneDpF    (Max wane depth front)
    cutWaneNA_MaxDpR: 45,   // = cutWaneDpR    (Max wane depth rear)
    cutWaneNA_BscWid: 46,   // = cutWaneLen2S  (Basic wane width)
    cutWaneNA_BscDpF: 47,   // = cutWaneLenF   (Basic wane depth front)
    cutWaneNA_BscDpR: 48,   // = cutWaneLenR   (Basic wane depth rear)
    cutWaneNA_1Edg_End: 49, // = cutSSLen      (One edge wane or End wane)


    cutKnotNA_EffSize: 50,
    cutKnotNA_FrontSize: 51,
    cutKnotNA_RearSize: 52,
    cutKnotNA_XSection: 53,
    cutKnotNA_SumAll: 54,
    cutKnotNA_SumHole: 55,

    cutSawcut: 56,

    cutLowTh: 57,           // Added 14.05.2008
    cutHiTh: 58,
    cutShakeSlope: 59,

    cutAlternateGrade: 60,

    cutSapwood: 61,

    cutPith: 62,
    cutMold: 63,            // molds

    cutOther: 64,           // just in case....
    cutFreckles: 65,
    cutEndSpy: 66,
    cutTopBreak: 67,
    cutEndSplit: 68,
    cutKntDmSound: 69,
    cutKntDmDead: 70,
    cutKntDmBark: 71
};

var enumRemanSol = {
    rsNormal: 0,
    rsComp: 1,
    rsCutInTwo: 2,
    rsWasteComp: 3,
    rsRipInTwo: 4,
    rsShop: 5,
    rsRipInThree: 6,
    rsRipInFour: 7,
    rsReservedForRipInFive: 8
};

var enumEdgingSolution = {
    edgReject: 0,
    edgCenter: 1,
    edgParDisp: 2,
    edgStandPos: 3,
    edgFlyPos: 4,
    edgSorting: 5,
    edgByPass: 6,
    edgUpsideDown: 7
};

var enumPositioningArmType = {
    epaNotUsed: 0,
    epaCenter: 1,
    epaPositioning: 2
};

var enumImageSource = {
    NoImage: 0, 
    FromFile: 1, 
    FromScanner: 2, 
    FromEndSpy: 3, 
    FromIHInspector: 4
};

var enumMainDefect = {
    dtKnot: 0,
    dtSplit: 1,
    dtBark: 2,
    dtPitch: 3,
    dtRot: 4,
    dtBlueStain: 5,
    dtInsectHole: 6,
    dtColor: 7,
    dtSkip: 8,
    dtRedStain: 9,
    dtSpeck: 10,
    dtMark: 11,
    dtRoughness: 12,
    dtMachineBite: 13,
    dtSlopeOfGrain: 14,
    dtSawCut: 15,
    dtGrubHole: 16,
    dtGrainDistance: 17,
    dtPith: 18,
    dtWEPitch: 19,
    dtEdgeBite: 20,
    dtMold: 21,
    dtBirdEye: 22,
    dtSawStep: 23,
    dtClearWood: 24,
    dtNoMainDefect: 25,
    dtDirt: 26,
    dtText: 27,
    dtNearPith: 28,
    dtTopBreak: 29,
    dtRotFSN: 30,
    dtGhostFSN: 31
};

var enumSubDefect = {
    dtSound: 0,
    dtDead: 1,
    dtKnotHole: 2,
    dtBarkKnot: 3,
    dtFirmRot: 4,
    dtSoftRot: 5,
    dtBlack: 6,
    dtWhite: 7,
    dtRed: 8,
    dtGreen: 9,
    dtBlue: 10,
    dtYellow: 11,
    dtPurple: 12,
    dtLight: 13,
    dtMedium: 14,
    dtHeavy: 15,
    dtStreak: 16,
    dtCheckKnot: 17,
    dtSurfingFibre: 18,
    dtDivingFiber: 19,
    dtNoSubDefect: 20
};

var enumDefectShape = {
    dtRound: 0,
    dtArris: 1,
    dtSpike: 2,
    dtSplay: 3,
    dtCrossw: 4,
    dtLengthw: 5,
    dtXMark: 6,
    dtArrDownMark: 7,
    dtArrUpMark: 8,
    dtNoDefectShape: 9
};

var enumMSErrorFlags = {
    errZeroThickness: 0,
    errTooThin: 1,
    errTooThick: 2,
    warnTooThin: 3,
    warnTooThick: 4,
    errTooNarrow: 5,
    errTooWide: 6,
    warnTooDry: 7,
    warnTooWet: 8,
    errNoSignal: 9,
    errUnknown: 10,
    warnResMissing: 11,
    errBoardEnd: 12,
    errTooMuchWane: 13
};

var enumNoFilterReason = {
    nfrNoReason: 0, 
    nfrNumOfSamples: 1,
    nfrThGap: 2,
    nfrAvePerc: 3
};

var enumGradingInterval = {
    griXLim_Dim: 0,
    griXLim_Skip: 1,
    griXLim_MSR: 2,
    griXLim_MC: 3,
    griXLim_AltQ: 4,
    griXLim_AnnualRings: 5,
    griXLim_7: 6,
    griXLim_8: 7,
    griWane_Scand: 8,
    griWane_NA: 9,
    griWane_3: 10,
    griWane_4: 11,
    griWane_5: 12,
    griWane_6: 13,
    griWane_7: 14,
    griWane_8: 15,
    griKnot_Scand: 16,
    griKnot_NAdim: 17,
    griKnot_NAapp: 18,
    griKnot_EndZone: 19,
    griKnot_SKR: 20,
    griKnot_6: 21,
    griKnot_7: 22,
    griKnot_8: 23,
    griPitch: 24,
    griBark: 25,
    griSplit: 26,
    griShakeSlope: 27,
    griEdgeShake: 28,
    griShake_6: 29,
    griShake_7: 30,
    griShake_8: 31,
    griBluestainFace: 32,
    griBluestainEdge: 33,
    griRedstainFace: 34,
    griRedstainEdge: 35,
    griRotFace: 36,
    griRotEdge: 37,
    griEndRot: 38,
    griSpeckFace: 39,
    griSpeckEdge: 40,
    griPinWorms: 41,
    griSlopeGrain: 42,
    griMachineBite: 43,
    griSawcut: 44,
    griSawStep: 45,
    griSapwood: 46,
    griEndBlue: 47,
    griWarp: 48,
    griPith: 49,
    griMoldFace: 50,
    griFreckles: 51,
    griDarkRot: 52,
    griHeavyBluestain: 53,
    griTopBreak: 54
};

var enumExtReason = {
    xrNone: 0,
    xrLength: 1,
    xrManuGrade: 2,
    xrTrimSawPos: 3,
    xrCutOff1TooBig: 4,
    xrCutOff2TooBig: 5,
    xrHeartwood: 6,
    xrMoisture: 7,
    xrRotBatch: 8,
    xrBlueBatch: 9,
    xrCrayon: 10,
    xrRingDensity: 11,
    xrMSR: 12,
    xrRingAveDist: 13,
    xrRingMaxDist: 14,
    xrRingSD: 15,
    xrRingSummerWood: 16,
    xrXLog: 17,
    xrESRot: 18,
    xrESBluestain: 19,
    xrESShake: 20,
    xrPLS: 21,
    xrESPith: 22
};