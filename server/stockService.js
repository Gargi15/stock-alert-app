import axios from "axios";


async function fetchIndex(symbol) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;

    const response = await axios.get(url);

    const result = response.data.chart.result[0];

    return {
        price: result.meta.regularMarketPrice,
        prevClose: result.meta.chartPreviousClose
    };
}

export async function getNiftyData() {
    return fetchIndex("%5ENSEI"); // ^NSEI
}

export async function getSensexData() {
    return fetchIndex("%5EBSESN"); // ^BSESN
}

export async function getStockData(symbol) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;

    try {
        const response = await axios.get(url);

        const result = response.data.chart.result[0];
        const price = result.meta.regularMarketPrice;
        const prevClose = result.meta.chartPreviousClose;

        return {
            price,
            prevClose
        };
    } catch (error) {
        console.error(`Error fetching ${symbol}:`, error.message);
        return null;
    }
}