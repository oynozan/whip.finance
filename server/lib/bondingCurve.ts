/**
 * Linear Bonding Curve implementation
 * 
 * Price formula: P(s) = basePrice + slope × supply
 * Market Cap = Reserve (TVL), NOT supply × price
 * 
 * Current params: basePrice=0.001, slope=0.01
 * - At 10 tokens: 0.101 IP
 * - At 20 tokens: 0.201 IP
 * - At 100 tokens: 1.001 IP
 * - At 1000 tokens: 10.001 IP
 */
export class LinearBondingCurve {
    constructor(
        private basePrice: number, // starting price in $IP
        private slope: number, // price increase per token
    ) {}

    // Current price at supply s
    priceAtSupply(supply: number) {
        return this.basePrice + this.slope * supply;
    }

    // Cost to buy qty tokens from current supply
    costToBuy(supply: number, qty: number) {
        // ∫(b + m*x) dx from s to s+q = b*q + m*( (s+q)^2 - s^2 )/2
        const b = this.basePrice;
        const m = this.slope;
        return b * qty + m * ((Math.pow(supply + qty, 2) - Math.pow(supply, 2)) / 2);
    }

    // Refund when selling qty tokens from current supply (reverse)
    refundForSell(supply: number, qty: number) {
        // Selling burns from (supply - qty) to supply
        const b = this.basePrice;
        const m = this.slope;
        return b * qty + m * ((Math.pow(supply, 2) - Math.pow(supply - qty, 2)) / 2);
    }
}

