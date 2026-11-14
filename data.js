/* ALL data below is SIMULATED for demo purposes only. It is not real astronaut data. */
(function () {
  'use strict';

  var astronauts = [
    {
      id: 'a1',
      name: 'Maya Okafor',
      role: 'Commander',
      story: 'healthy',
      storyLabel: 'healthy and steady',
      baseline: {
        bpSys: 118,
        bpDia: 76,
        heartRate: 64,
        bloodSugar: 5.1,
        temp: 36.7,
        sleepHours: 7.5,
        mood: 8
      }
    },
    {
      id: 'a2',
      name: 'Elias Varga',
      role: 'Crew Medical Officer',
      story: 'sleep-drift',
      storyLabel: 'sleep drifting down night after night',
      baseline: {
        bpSys: 121,
        bpDia: 78,
        heartRate: 62,
        bloodSugar: 5.0,
        temp: 36.6,
        sleepHours: 8.0,
        mood: 8
      }
    },
    {
      id: 'a3',
      name: 'Nia Mensah',
      role: 'Mission Specialist',
      story: 'bp-rise',
      storyLabel: 'blood pressure rising over 30 days',
      baseline: {
        bpSys: 116,
        bpDia: 74,
        heartRate: 66,
        bloodSugar: 5.2,
        temp: 36.8,
        sleepHours: 7.2,
        mood: 7
      }
    },
    {
      id: 'a4',
      name: 'Jonas Lindberg',
      role: 'Flight Engineer',
      story: 'emergency',
      storyLabel: 'becomes the chest-pain emergency in the demo',
      baseline: {
        bpSys: 120,
        bpDia: 77,
        heartRate: 65,
        bloodSugar: 5.1,
        temp: 36.7,
        sleepHours: 7.4,
        mood: 8
      }
    }
  ];

  var readings = [];
  var startDate = new Date(Date.UTC(2026, 9, 16));

  for (var day = 0; day < 30; day += 1) {
    var date = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    for (var crewIndex = 0; crewIndex < astronauts.length; crewIndex += 1) {
      var astronaut = astronauts[crewIndex];
      var reading = {
        astronautId: astronaut.id,
        date: date,
        source: 'simulated',
        bpSys: astronaut.baseline.bpSys,
        bpDia: astronaut.baseline.bpDia,
        heartRate: astronaut.baseline.heartRate,
        bloodSugar: astronaut.baseline.bloodSugar,
        temp: astronaut.baseline.temp,
        sleepHours: astronaut.baseline.sleepHours,
        mood: astronaut.baseline.mood,
        radiationMsvCumulative: 110 + day,
        eyeChangeUm: 10
      };

      if (astronaut.id === 'a1') {
        reading.bpSys += [0, 1, -1, 2, -2, 1, 0][day % 7];
        reading.bpDia += [0, 1, -1, 0, 1, -1, 0][day % 7];
        reading.heartRate += [0, 1, -1, 2, -2, 1, 0][day % 7];
        reading.bloodSugar += [0, 0.1, -0.1, 0, 0.1, -0.1, 0][day % 7];
        reading.temp += [0, 0.1, 0, -0.1, 0, 0.1, 0][day % 7];
        reading.sleepHours += [0, 0.2, -0.1, 0.1, -0.2, 0.1, 0][day % 7];
        reading.mood = [8, 8, 9, 8, 7, 8, 8][day % 7];
        reading.eyeChangeUm = 10 + (day % 5) * 0.1;
      } else if (astronaut.id === 'a2') {
        reading.sleepHours = 8 - day * 0.08;
        reading.mood = Math.max(5, 8 - Math.floor(day / 8));
        reading.heartRate = 62 + Math.floor(day / 5);
        reading.eyeChangeUm = 10 + day * 0.15;
      } else if (astronaut.id === 'a3') {
        reading.bpSys = 116 + day;
        reading.bpDia = 74 + Math.round(day * 0.55);
        reading.eyeChangeUm = 10 + day * 0.2;
      } else if (astronaut.id === 'a4') {
        reading.bpSys = 120 + day;
        reading.bpDia = 77 + Math.round(day * 0.55);
        reading.heartRate = 65 + Math.floor(day * 0.32);
        reading.sleepHours = 7.4 - day * 0.06;
        reading.mood = Math.max(4, 8 - Math.floor(day / 7));
        reading.eyeChangeUm = 10 + day * (11 / 29);
      }

      readings.push(reading);
    }
  }

  var inventory = [
    { id: 'i1', name: 'First-aid kits', quantity: 8, expiryDate: '2027-06-30', lowStockAt: 3 },
    { id: 'i2', name: 'Blood pressure cuffs', quantity: 4, expiryDate: '2028-03-15', lowStockAt: 2 },
    { id: 'i3', name: 'Pain relief tablets', quantity: 2, expiryDate: '2027-01-12', lowStockAt: 5 },
    { id: 'i4', name: 'Sterile dressings', quantity: 12, expiryDate: '2027-08-20', lowStockAt: 4 },
    { id: 'i5', name: 'Saline solution', quantity: 6, expiryDate: '2026-12-05', lowStockAt: 2 },
    { id: 'i6', name: 'Pulse oximeter sensors', quantity: 10, expiryDate: '2028-01-31', lowStockAt: 3 }
  ];

  window.CREWCARE_DATA = {
    astronauts: astronauts,
    readings: readings,
    inventory: inventory
  };
})();
