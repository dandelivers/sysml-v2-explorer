export const DEFAULT_TEXT = `package 'Earth Observation Satellite' {

  // ════════════════════════════════════════════════════════════════
  // REQUIREMENTS
  // ════════════════════════════════════════════════════════════════

  abstract requirement def MissionRequirement {}

  requirement def ImageResolutionReq  :> MissionRequirement {}
  requirement def OrbitAltitudeReq    :> MissionRequirement {}
  requirement def DataDownlinkReq     :> MissionRequirement {}
  requirement def OperationalLifetimeReq :> MissionRequirement {}
  requirement def LaunchMassReq       :> MissionRequirement {}

  abstract requirement def SystemRequirement :> MissionRequirement {}

  requirement def AttitudeAccuracyReq  :> SystemRequirement {}
  requirement def PowerBudgetReq       :> SystemRequirement {}
  requirement def ThermalControlReq    :> SystemRequirement {}
  requirement def CommsBandwidthReq    :> SystemRequirement {}
  requirement def StorageCapacityReq   :> SystemRequirement {}

  requirement def SolarArrayOutputReq  :> PowerBudgetReq {}
  requirement def BatteryCapacityReq   :> PowerBudgetReq {}
  requirement def TransponderFreqReq   :> CommsBandwidthReq {}
  requirement def CameraResolutionReq  :> ImageResolutionReq {}
  requirement def ReactionWheelTorqueReq :> AttitudeAccuracyReq {}


  // ════════════════════════════════════════════════════════════════
  // FUNCTIONS  (satisfy links requirement → action)
  // ════════════════════════════════════════════════════════════════

  action def CaptureImage {
    satisfy ImageResolutionReq;
    satisfy CameraResolutionReq;
    allocate payload to PayloadSubsystem;
  }

  action def TransmitData {
    satisfy DataDownlinkReq;
    satisfy CommsBandwidthReq;
    satisfy TransponderFreqReq;
    allocate comms to CommunicationSubsystem;
  }

  action def ControlAttitude {
    satisfy AttitudeAccuracyReq;
    satisfy ReactionWheelTorqueReq;
    allocate adcs to AttitudeControlSubsystem;
  }

  action def ManagePower {
    satisfy PowerBudgetReq;
    satisfy SolarArrayOutputReq;
    satisfy BatteryCapacityReq;
    allocate power to PowerSubsystem;
  }

  action def ProcessTelemetry {
    satisfy StorageCapacityReq;
    allocate obc to OnBoardComputer;
  }


  // ════════════════════════════════════════════════════════════════
  // STRUCTURE
  // ════════════════════════════════════════════════════════════════

  abstract part def Subsystem {}

  part def SolarArray {}
  part def BatteryUnit {}
  part def PowerDistributionUnit {}

  part def PowerSubsystem :> Subsystem {
    part solarArray : SolarArray;
    part battery    : BatteryUnit;
    part pdu        : PowerDistributionUnit;
  }

  part def Transponder {}
  part def Antenna {}
  part def CommandDecoder {}

  part def CommunicationSubsystem :> Subsystem {
    part transponder : Transponder;
    part antenna     : Antenna;
    part cmdDecoder  : CommandDecoder;
  }

  part def StarTracker {}
  part def ReactionWheel {}
  part def Magnetorquer {}

  part def AttitudeControlSubsystem :> Subsystem {
    part starTracker   : StarTracker;
    part reactionWheel : ReactionWheel;
    part magnetorquer  : Magnetorquer;
  }

  part def ImagingCamera {}
  part def DataStorage {}
  part def ImageProcessor {}

  part def PayloadSubsystem :> Subsystem {
    part camera      : ImagingCamera;
    part dataStorage : DataStorage;
    part imageProc   : ImageProcessor;
  }

  part def FlightSoftware {}
  part def TelemetryEncoder {}

  part def OnBoardComputer :> Subsystem {
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
}
`;
