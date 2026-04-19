export const DEFAULT_TEXT = `package 'Earth Observation Satellite' {

  // ══════════════════════════════════════════════════════════════
  // REQUIREMENTS
  // ══════════════════════════════════════════════════════════════

  requirement def ImageResolutionReq {}
  requirement def OrbitAltitudeReq {}
  requirement def DataDownlinkReq {}
  requirement def OperationalLifetimeReq {}
  requirement def LaunchMassReq {}

  requirement def MissionRequirements {
    requirement imageRes    : ImageResolutionReq;
    requirement orbitAlt    : OrbitAltitudeReq;
    requirement dataDownlink: DataDownlinkReq;
    requirement lifetime    : OperationalLifetimeReq;
    requirement launchMass  : LaunchMassReq;
  }

  requirement def AttitudeAccuracyReq {}
  requirement def PowerBudgetReq {}
  requirement def ThermalControlReq {}
  requirement def CommsBandwidthReq {}
  requirement def StorageCapacityReq {}

  requirement def SystemRequirements {
    requirement attitude : AttitudeAccuracyReq;
    requirement power    : PowerBudgetReq;
    requirement thermal  : ThermalControlReq;
    requirement comms    : CommsBandwidthReq;
    requirement storage  : StorageCapacityReq;
  }

  requirement def SolarArrayOutputReq {}
  requirement def BatteryCapacityReq {}
  requirement def TransponderFreqReq {}
  requirement def CameraResolutionReq {}
  requirement def ReactionWheelTorqueReq {}

  requirement def SubsystemRequirements {
    requirement solarOutput : SolarArrayOutputReq;
    requirement battCapacity: BatteryCapacityReq;
    requirement transpFreq  : TransponderFreqReq;
    requirement cameraRes   : CameraResolutionReq;
    requirement rwTorque    : ReactionWheelTorqueReq;
  }


  // ══════════════════════════════════════════════════════════════
  // FUNCTIONS
  // ══════════════════════════════════════════════════════════════

  action def CaptureImage {}
  action def TransmitData {}
  action def ControlAttitude {}
  action def ManagePower {}
  action def ProcessTelemetry {}


  // ══════════════════════════════════════════════════════════════
  // STRUCTURE
  // ══════════════════════════════════════════════════════════════

  part def SolarArray {}
  part def BatteryUnit {}
  part def PowerDistributionUnit {}

  part def PowerSubsystem {
    part solarArray : SolarArray;
    part battery    : BatteryUnit;
    part pdu        : PowerDistributionUnit;
  }

  part def Transponder {}
  part def Antenna {}
  part def CommandDecoder {}

  part def CommunicationSubsystem {
    part transponder : Transponder;
    part antenna     : Antenna;
    part cmdDecoder  : CommandDecoder;
  }

  part def StarTracker {}
  part def ReactionWheel {}
  part def Magnetorquer {}

  part def AttitudeControlSubsystem {
    part starTracker   : StarTracker;
    part reactionWheel : ReactionWheel;
    part magnetorquer  : Magnetorquer;
  }

  part def ImagingCamera {}
  part def DataStorage {}
  part def ImageProcessor {}

  part def PayloadSubsystem {
    part camera      : ImagingCamera;
    part dataStorage : DataStorage;
    part imageProc   : ImageProcessor;
  }

  part def FlightSoftware {}
  part def TelemetryEncoder {}

  part def OnBoardComputer {
    part flightSoftware : FlightSoftware;
    part telemEncoder   : TelemetryEncoder;
  }

  part def EarthObservationSatellite {
    part power   : PowerSubsystem;
    part comms   : CommunicationSubsystem;
    part adcs    : AttitudeControlSubsystem;
    part payload : PayloadSubsystem;
    part obc     : OnBoardComputer;
  }


  // ══════════════════════════════════════════════════════════════
  // REQUIREMENT → FUNCTION CONNECTIONS
  // ══════════════════════════════════════════════════════════════

  connection def ImageReqToCapture {
    end req : ImageResolutionReq;
    end fn  : CaptureImage;
  }
  connection def CameraReqToCapture {
    end req : CameraResolutionReq;
    end fn  : CaptureImage;
  }
  connection def DownlinkReqToTransmit {
    end req : DataDownlinkReq;
    end fn  : TransmitData;
  }
  connection def AttitudeReqToControl {
    end req : AttitudeAccuracyReq;
    end fn  : ControlAttitude;
  }
  connection def PowerReqToManage {
    end req : PowerBudgetReq;
    end fn  : ManagePower;
  }


  // ══════════════════════════════════════════════════════════════
  // FUNCTION → STRUCTURE CONNECTIONS
  // ══════════════════════════════════════════════════════════════

  connection def CaptureToPayload {
    end fn     : CaptureImage;
    end struct : PayloadSubsystem;
  }
  connection def TransmitToComms {
    end fn     : TransmitData;
    end struct : CommunicationSubsystem;
  }
  connection def ControlToADCS {
    end fn     : ControlAttitude;
    end struct : AttitudeControlSubsystem;
  }
  connection def PowerToSubsystem {
    end fn     : ManagePower;
    end struct : PowerSubsystem;
  }
  connection def TelemetryToOBC {
    end fn     : ProcessTelemetry;
    end struct : OnBoardComputer;
  }
}
`;
