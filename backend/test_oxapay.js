async function test() {
    const oxapayResponse = await fetch('https://api.oxapay.com/merchants/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            merchant: 'FDC1EH-9ZDIDF-PQ3DBL-FQUBRH',
            amount: '5.00',
            currency: 'USD',
            orderId: '123456789',
            description: 'Test Deposit',
        })
    });
    const data = await oxapayResponse.json();
    console.log(data);
}
test();
