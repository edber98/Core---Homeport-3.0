export function buildLineChart(ctx, label, labels, data, color){
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label,
        data,
        fill:false,
        borderColor: color,
        pointRadius: 0,
        tension: 0.15,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { x: { ticks: { maxTicksLimit: 8 } } },
      plugins: { legend: { display:false } }
    }
  });
}

export function buildStackedBarChart(ctx, labels, datasets){
  return new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { x: { stacked: true }, y: { stacked: true } },
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

export function buildMultiLineChart(ctx, labels, datasets){
  return new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { x: { ticks: { maxTicksLimit: 8 } } },
      plugins: { legend: { position: 'bottom' } },
      elements: { point: { radius: 0 } },
    }
  });
}

export function downloadChartPng(chart, filename){
  const url = chart.toBase64Image('image/png', 1);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
}
