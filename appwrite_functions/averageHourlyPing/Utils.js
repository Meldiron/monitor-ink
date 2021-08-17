const calculateAverageStats = (pings) =>
// {
//     averageResponseTime: number;
//     averageStatus: string;
//     averageUptime: number;
//   }
{
  let totalDown = 0;
  let totalUp = 0;
  let totalSlow = 0;

  let totalResponseTime = 0;
  let totalResponseAverage = 0;

  for (const ping of pings) {
    if (ping.status === 'slow') {
      totalSlow++;
    } else if (ping.status === 'down') {
      totalDown++;
    } else if (ping.status === 'up') {
      totalUp++;
    }

    totalResponseAverage += ping.responseTime;
    if (ping.responseTime > 0) {
      totalResponseTime++;
    }
  }

  const averageStatus =
    totalDown > 0 ? 'down' : totalSlow > 0 ? 'slow' : 'up';
  const averageResponseTime = totalResponseAverage / totalResponseTime;
  const averageUptime =
    ((totalUp + totalSlow) / (totalUp + totalSlow + totalDown)) * 100;

  return {averageResponseTime, averageStatus, averageUptime};

}

exports.calculateAverageStats = calculateAverageStats;
