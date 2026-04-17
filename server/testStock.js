import { getNiftyData , getSensexData} from "./stockService.js";


function calculateChange(price, prevClose) {
    return ((price - prevClose) / prevClose) * 100;
}

async function testStock() {
    const nifty = await getNiftyData();
    const sensex = await getSensexData();

    console.log("NIFTY:", calculateChange(nifty.price, nifty.prevClose).toFixed(2), "%");
    console.log("SENSEX:", calculateChange(sensex.price, sensex.prevClose).toFixed(2), "%");
}

testStock();