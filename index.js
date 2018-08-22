const inputPath = './data/input.json';
const outputPath = 'data/output.json';
const modes = {
    'day': {
        'from': 7,
        'to': 21
    },
    'night': {
        'from': 21,
        'to': 7
    },
    'undefined': {
        'from': 0,
        'to': 23
    }
};

loadData = (path) => {
    return require(path);
}

writeData = (object, path) => {
    let fs = require('fs');
    fs.writeFile(path, JSON.stringify(object, null, 3), function(err) {
        if(err) {
            console.log(err);
        } else {
            console.log("JSON saved to " + path);
        }
    });
};

formatStr = (string) => {
    return string.toFixed(4).replace(/0+$/, '');
};

/* Вспомогательный метод для пересчета часов, если период захватывает стык суток */

changePeriod = (from, to) => {
    return from > to ? to + 24 : to;
};

/* Создание ассоциативного массива, где в соответствеии с тарифами оценён каждый час суток */

countTimeRates = (rates) => {
    let hourRates = new Map();
    rates.forEach(rate => {
        rate.to = changePeriod(rate.from, rate.to);
        for (let i = rate.from; i < rate.to; i++) {
            hourRates.set(i % 24, rate.value);
        }
    });
    return new Map([...hourRates.entries()].sort((a, b) => {
        return a[0] - b[0];
    }));
};

/* Подсчёт цены для каждого часа в возможном диапазоне часов работы */

countPossibleCosts = (device, rates) => {
    // Определение границ возможных часов работы для текущего девайса, в соответствии с modes
    let start = modes[device.mode].from;
    let end = changePeriod(start, modes[device.mode].to);

    let costs = new Map();

    for (let i = start; i <= end; i++) {
        costs.set(i % 24, device.power * rates.get(i % 24) / 1000)
    }

    // Сортировка по возрастанию цен, потом по часам работы
    return new Map([...costs.entries()].sort((a, b) => {
        if (a[1] === b[1]) {
            return a[0] - b[0];
        }
        return a[1] - b[1];
    }));
}

/* Инициализация объекта вывода */

initializeOutput = () => {
    let output = {
        'schedule': {},
        'consumedEnergy': {
            'value' : 0,
            'devices' : {}
        }
    };

    for (let i = 0; i < 24; i++) {
        output.schedule[i] = [];
    }

    return output;
}

/* Создание расписания */

createSchedule = (path) => {
    const data = loadData(path);
    const rates = countTimeRates(data.rates);
    const devices = data.devices.sort((a, b) => { // Сортируем приборы по длительности цикла работы
        return b.duration - a.duration;
    });
    const maxPower = data.maxPower;

    let power = new Array(24).fill(0); // Массив потребляемой мощности на каждый час
    let total = 0;

    let output = initializeOutput();

    devices.forEach(device => {
        const possibleCosts = countPossibleCosts(device, rates);
        let duration = device.duration;
        let deviceTotal = 0;

        for (let [key, value] of possibleCosts.entries()) {
            if (0 < duration && (power[key] + device.power) <= maxPower) {
                power[key] += device.power;
                output.schedule[key].push(device.id);
                deviceTotal += value;
                duration--;
            }
            if (duration <= 0) {
                break;
            }
        }

        total += deviceTotal;
        output.consumedEnergy.devices[device.id] = formatStr(deviceTotal);
    });
    output.consumedEnergy.value = formatStr(total);

    writeData(output, outputPath);
};

createSchedule(inputPath);