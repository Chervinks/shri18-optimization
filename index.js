const data = require("./data/input.json");

const modes = {
    'day': {
        'from': 7,
        'to': 21
    },
    'night': {
        'from': 21,
        'to': 7
    },
    'undefined' : {
        'from' : 0,
        'to': 23
    }
};

checkPeriod = (from, to) => {
    return from > to ? to + 24 : to;
};

countTimeRates = (rates) => {
    let hourRates = new Map();

    rates.forEach(rate => {
        rate.to = checkPeriod(rate.from, rate.to);
        for (let i = rate.from; i < rate.to; i++) {
            hourRates.set(i % 24, rate.value);
        }
    });

    return new Map([...hourRates.entries()].sort((a, b) => {
        return a[0] - b[0];
    }));
}

const timeRates = countTimeRates(data.rates);
const devicesSorted = data.devices.sort((a, b) => {
    return b.duration - a.duration;
});
const maxPower = data.maxPower;

createSchedule = (rates, devices, maxPower) => {
    let schedule = [];
    let power = new Array(24).fill(0);

    for (let i = 0; i < 24; i++) {
        schedule[i] = [];
    }

    devices.forEach(device => {
        let frameStart = modes[device.mode].from;
        let frameEnd = checkPeriod(frameStart, modes[device.mode].to);

        let duration = device.duration;
        let costs = new Map();
        let total = 0;

        for (let i = frameStart; i <= frameEnd; i++) {
            costs.set(i % 24, device.power * timeRates.get(i % 24) / 1000)
        }

        let sortedCosts = new Map([...costs.entries()].sort((a, b) => {
            if (a[1] === b[1]) {
                return a[0] - b[0];
            }
            return a[1] - b[1];
        }));

        for (let [key, value] of sortedCosts.entries()) {
            if (0 < duration && power[key] < maxPower) {
                power[key] += device.power;
                schedule[key].push(device.id);
                total += value;
                duration--;
            }
        }
        console.log(device.name, total.toFixed(4));
    });
    console.log(schedule)
};

createSchedule(timeRates, devicesSorted, maxPower);