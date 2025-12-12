import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const EarningsModule = buildModule("EarningsModule", (m) => {
    const earnings = m.contract("Earnings");
    return { earnings };
});

export default EarningsModule;

