export function calculateChange(price, prevClose) {
    return ((price - prevClose) / prevClose) * 100;
}

export function shouldAlert(change, threshold = 2) {
    return Math.abs(change) >= threshold;
}