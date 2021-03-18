$( document ).ready(function() {
  /*
    Global viz variables
  */
  var budgetYear = $ITDB2.budgetYear,
      initYear = 2012,
      initYearDcoi = 2016,
      thisYear = (new Date()).getFullYear(),
      agencyCode = document.getElementById('agencyCode') ? document.getElementById('agencyCode').value : $ITDB2.agencyCode || '000',
      uii = document.getElementById('uii') ? document.getElementById('uii').value : '000';

  /*
    Color definitions to be shared across charts
  */
  var c = {
    blue: '#7cb5ec',
    orange: '#ffa100',
    purple: '#a65697',
    purpleLight: '#c070b1',
    red: '#993131',
    yellow: '#ffbb3a',
    green: '#518245',
    greenLight: '#6aca54'
  };

  /*
    Size definitions to be shared across chart types
  */
  var h = {
    area: 325,
    bar: 275,
    barGrouped: 500,
    barStacked: 400,
    donut: 425,
    donutSmall: 225,
    arc: 100,
    arcSmall: 35
  };

  /*
    Date range default variables
  */
  var today = new Date(),
      before = new Date(),
      defaultRangeMonths = 15;
      before.setMonth(before.getMonth() - defaultRangeMonths);
  var defaultEndDateYear = today.getFullYear(),
      defaultEndDateMonth = ((today.getMonth() + 1) < 10) ? '0' + (today.getMonth() + 1) : today.getMonth() + 1,
      defaultEndDateDay = (today.getDate() < 10) ? '0' + today.getDate() : today.getDate(),
      defaultStartDateYear = before.getFullYear(),
      defaultStartDateMonth = ((before.getMonth() + 1) < 10) ? '0' + (before.getMonth() + 1) : before.getMonth() + 1,
      defaultStartDateDay = '01';
  var defaultEndDate = defaultEndDateYear + '-' + defaultEndDateMonth + '-' + defaultEndDateDay,
      defaultStartDate = defaultStartDateYear + '-' + defaultStartDateMonth + '-' + defaultStartDateDay;

  /*
    Visualization elements
  */
  var govwideItSpending,
      investmentCioRatingSummary,
      majorSpending,
      // sdlcMethodology,
      costVariance,
      scheduleVariance,
      cioRatingHistory,
      costSavingsCombined,
      costSavingsDcoi,
      costSavingsOther;

  /*
    API endpoints
  */
  var urlBase = '/api/v1/ITDB2/';
  var govwideItSpendingUrl = urlBase + 'visualization/govwide/it_spending',
      investmentCioRatingSummaryUrl = urlBase + 'visualization/govwide/investmentCIORatingSummary/budgetYear/' + budgetYear + '/agencyCode/' + agencyCode,
      totalSpendingUrl = urlBase + 'visualization/govwide/it_spending/agencyCode/' + agencyCode,
      majorSpendingUrl = urlBase + 'visualization/agency/majorSpending/agencyCode/' + agencyCode,
      // sdlcMethodologyUrl = urlBase + 'visualization/agency/SDLCMethod/agencyCode/' + agencyCode,
      costVarianceUrl = urlBase + 'visualization/investment/costVariance/uii/' + uii,
      scheduleVarianceUrl = urlBase + 'visualization/investment/scheduleVariance/uii/' + uii,
      cioRatingHistoryUrl = '/api/v1/ITDB2/visualization/investment/cioRatingTrend/uii/' + uii + '/startDate/' + defaultStartDate + '/endDate/' + defaultEndDate + '/groupBy/month',
      costSavingsOmbUrl = urlBase + 'costSavings/agencyCode/' + agencyCode + '/ombInitiative/Data%20Center',
      costSavingsOtherUrl = urlBase + 'costSavings/agencyCode/' + agencyCode + '/excludeOmbInitiative/Data%20Center',
      costSavingsTargetUrl = urlBase + 'costSavingsPolicyTarget',
      // costSavingsOmbUrl = '/drupal/sites/itdb/themes/itdb/assets/test-json/fy20/cost-savings-omb.json',
      // costSavingsOtherUrl = '/drupal/sites/itdb/themes/itdb/assets/test-json/fy20/cost-savings-other.json',
      // costSavingsTargetUrl = '/drupal/sites/itdb/themes/itdb/assets/test-json/fy20/cost-savings-target.json',
      costSavingsMissDataUrl = urlBase + 'costSavings/missingAgency/dataCenter',
      costSavingsMissNonDataUrl = urlBase + 'costSavings/missingAgency/nonDataCenter';
      dataCenterClosureProgressUrl = urlBase + 'dataCenterClosureProgress/agencyCode/' + agencyCode;

  /*
    Function to sort JSON results
  */
  function sortJSON(data, key, way) {
    return data.sort(function(a, b) {
      var x = a[key]; var y = b[key];
      if (way === '123') { return ((x < y) ? -1 : ((x > y) ? 1 : 0)); }
      if (way === '321') { return ((x > y) ? -1 : ((x < y) ? 1 : 0)); }
    });
  }

  /*
    Function to get variable from current URL
  */
  function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
      var pair = vars[i].split("=");
      if(pair[0] == variable){return pair[1];}
    }
    return(false);
  }

  /*
    Function to output basic tooltip contents
  */
  function tooltipBasic(tableClass, rowClass, bgColor, name, value) {
    var text = "<table class='" + tableClass + "'>";
    text += "<tr class='" + rowClass + "'>";
    text += "<td class='name'><span style='background-color:" + bgColor + "'></span><strong>" + name + "</strong></td>";
    text += "</tr>";
    text += "<tr>";
    text += "<td class='value'>" + value + "</td>";
    text += "</tr>";
    text += "</table>";
    return text;
  }

  /*
    Function to get the union of 2 arrays
  */
  function union(arra1, arra2) {
    if ((arra1 == null) || (arra2==null))
      return void 0;
    var obj = {};
    for (var i = arra1.length-1; i >= 0; -- i)
       obj[arra1[i]] = arra1[i];
    for (var i = arra2.length-1; i >= 0; -- i)
       obj[arra2[i]] = arra2[i];
    var res = [];
    for (var n in obj) {
      if (obj.hasOwnProperty(n))
        res.push(obj[n]);
    }
    return res;
  }

  /*
    Use Require.js to load D3 and C3, and then generate charts
  */
  require.config({
    paths: {
      d3: '/js/D3/d3.min',
      c3: '/js/C3/c3.min'
    }
  });
  require(['d3', 'c3'], function(d3, c3) {

    /*
      Home Page — Bar Chart — Government-wide IT Spending
    */
    if (document.getElementById('c3-govwide-it-spending')) {
      $.getJSON(govwideItSpendingUrl, function(govwideItSpendingData) {
        /*
          Initialize C3 chart
        */
        govwideItSpending = c3.generate({
          bindto: '#c3-govwide-it-spending',
          size: {
            height: h.bar
          },
          data: {
            json: govwideItSpendingData.result,
            type: 'bar',
            keys: {
              x: 'fiscalYear',
              value: ['dollarSpendingGovwide']
            },
            names: {
              fiscalYear: 'Fiscal Year',
              dollarSpendingGovwide: 'Government-wide IT Spending'
            },
            colors: {
              dollarSpendingGovwide: c.blue
            }
          },
          axis: {
            x: {
              type: 'category',
              tick: {
                format: function (i) {
                  var $$ = this, config = $$.config;
                  return 'FY' + config.axis_x_categories[i];
                },
                multiline: false,
                rotate: -45
              },
              height: 20
            },
            y: {
              label: {
                text: 'IT Spending ($)',
                position: 'outer-middle'
              },
              max: 100000,
              padding: {
                top: 0,
                bottom: 0
              },
              tick: {
                count: 5,
                format: function (d) {
                  return d / 1000 + '.0B';
                }
              }
            }
          },
          grid: {
            y: {
              show: true
            }
          },
          tooltip: {
            format: {
              value: function (d) {
                var round = d / 1000;
                return '$' + round.toFixed(1) + 'B';
              }
            }
          },
          padding: {
            top: 10,
            bottom: 30
          },
          legend: {
            show: false
          },
          onrendered: function () {
            var $$ = this, config = $$.config;
            var dataNames = config.data_names;
            var dataColors = config.data_colors;
            var wrapper = document.getElementById('c3-govwide-it-spending');
            var parent = wrapper.parentNode;

            /*
              Create custom legend as C3 legends tend to overlap in Firefox/IE/Edge
            */
            if (!parent.querySelector('.c3-legend-custom')) {
              var legend = document.createElement('ul');
              legend.classList.add('c3-legend-custom');
              legend.setAttribute('aria-hidden', 'true');
              var legendItems = '';
              Object.keys(dataNames).forEach(function(key) {
                if (dataNames[key] != 'Fiscal Year') {
                  legendItems += '<li><span style="background-color: ' + dataColors[key] + '"></span>' + dataNames[key] + '</li>';
                }
              });
              legend.innerHTML = legendItems;
              parent.appendChild(legend);
            }

            /*
              Add hidden data table for 508 compliance
            */
            if (!parent.querySelector('.c3-data-table')) {
              parent.setAttribute('aria-label', 'A chart.');
              wrapper.setAttribute('aria-hidden', 'true');
              var table = '<table class="c3-data-table" aria-label="A tabular view of the data in the chart."><thead><tr>';
              for (var key in dataNames) {
                table += '<th>' + dataNames[key] + '</th>';
              }
              table += '</tr></thead><tbody>';
              govwideItSpendingData.result.forEach(function(e) {
                var spend = e.dollarSpendingGovwide / 1000;
                table += '<tr><td>FY' + e.fiscalYear + '</td><td>$' + spend.toFixed(1) + 'B</td></tr>';
              });
              table += '</tbody></table>';
              var tableWrapper = document.createElement('div');
              tableWrapper.innerHTML = table;
              parent.appendChild(tableWrapper);
            }
          }
        });
      });
    }

    /*
      Home Page — Donut Chart — CIO Risk Ratings for Investments
    */
    if (document.getElementById('c3-investment-cio-rating-summary')) {
      $.getJSON(investmentCioRatingSummaryUrl, function(investmentCioRatingSummaryData) {
        /*
          Transform JSON into C3-friendly format
        */
        var cols = [];
        investmentCioRatingSummaryData.result.forEach(function(e) {
          cols.push([e.color, e.count]);
        });

        /*
          Sort JSON into custom order
        */
        var order = ['red', 'yellow', 'green'];
        cols.sort(function(a, b) {
          return order.indexOf(a[0]) - order.indexOf(b[0]);
        });

        /*
          Initialize C3 chart
        */
        investmentCioRatingSummary = c3.generate({
          bindto: '#c3-investment-cio-rating-summary',
          size: {
            height: h.donut
          },
          data: {
            type: 'donut',
            columns: cols,
            keys: {
              color: ['red', 'yellow', 'green']
            },
            names: {
              red: 'High Risk',
              yellow: 'Medium Risk',
              green: 'Low Risk'
            },
            colors: {
              red: c.red,
              yellow: c.yellow,
              green: c.green
            }
          },
          donut: {
            width: h.arc,
            label: {
              threshold: 0.01
            }
          },
          tooltip: {
            contents: function (d, defaultTitleFormat, defaultValueFormat, color) {
              var $$ = this, config = $$.config,
              nameFormat = config.tooltip_format_name || function (name) { return name; },
              valueFormat = config.tooltip_format_value || defaultValueFormat,
              text, i, value, name, bgcolor;

              for (i = 0; i < d.length; i++) {
                if (! (d[i] && (d[i].value || d[i].value === 0))) { continue; }

                name = nameFormat(d[i].name);
                value = valueFormat(d[i].value, d[i].ratio, d[i].id, d[i].index);
                bgcolor = $$.levelColor ? $$.levelColor(d[i].value) : color(d[i].id);

                var tableClass = $$.CLASS.tooltip,
                    rowClass = $$.CLASS.tooltipName + "-" + d[i].id;
                text = tooltipBasic(tableClass, rowClass, bgcolor, name, value);
              }
              return text;
            },
            format: {
              name: function (name, ratio, id, index) {
                return name;
              },
              value: function (value, ratio, id) {
                var p = 'Percent: <strong>' + (ratio * 100).toFixed(1) + '%</strong>';
                var v = 'Investments: <strong>' + value + '</strong>';
                return p + '<br>' + v;
              }
            }
          },
          legend: {
            show: false
          },
          onrendered: function () {
            var $$ = this, config = $$.config;
            var dataNames = config.data_names;
            var dataColors = config.data_colors;
            var wrapper = document.getElementById('c3-investment-cio-rating-summary');
            var parent = wrapper.parentNode;

            /*
              Create custom legend as C3 legends tend to overlap in Firefox/IE/Edge
            */
            if (!parent.querySelector('.c3-legend-custom')) {
              var legend = document.createElement('ul');
              legend.classList.add('c3-legend-custom');
              legend.setAttribute('aria-hidden', 'true');
              var legendItems = '';
              Object.keys(dataNames).forEach(function(key) {
                legendItems += '<li><span style="background-color: ' + dataColors[key] + '"></span>' + dataNames[key] + '</li>';
              });
              legend.innerHTML = legendItems;
              parent.appendChild(legend);
            }

            /*
              Add hidden data table for 508 compliance
            */
            if (!parent.querySelector('.c3-data-table')) {
              var totalInvestments = 0, highRisk = 0, mediumRisk = 0, lowRisk = 0;
              for (var i = 0; i < cols.length; i++) {
                totalInvestments += cols[i][1];
                switch (cols[i][0]) {
                  case 'red':
                  highRisk = cols[i][1];
                  break;
                  case 'yellow':
                  mediumRisk = cols[i][1];
                  break;
                  case 'green':
                  lowRisk = cols[i][1];
                  break;
                }
              }
              var highRatio = ((highRisk / totalInvestments) * 100).toFixed(1);
              var mediumRatio = ((mediumRisk / totalInvestments) * 100).toFixed(1);
              var lowRatio = ((lowRisk / totalInvestments) * 100).toFixed(1);
              parent.setAttribute('aria-label', 'A chart.');
              wrapper.setAttribute('aria-hidden', 'true');
              var table = '<table class="c3-data-table" aria-label="A tabular view of the data in the chart."><thead><tr>';
              for (var key in dataNames) {
                table += '<th>' + dataNames[key] + '</th>';
              }
              table += '</tr></thead><tbody><tr>';
              table += '<td>' + highRatio + '% (' + highRisk + ' investments)</td>';
              table += '<td>' + mediumRatio + '% (' + mediumRisk + ' investments)</td>';
              table += '<td>' + lowRatio + '% (' + lowRisk + ' investments)</td>';
              table += '</tbody></table>';
              var tableWrapper = document.createElement('div');
              tableWrapper.innerHTML = table;
              parent.appendChild(tableWrapper);
            }

            /*
              Fix issue with overlapping labels
            */
            var el = wrapper.querySelector('.c3-chart-arc.c3-target-red');
            el.parentElement.appendChild(el);
          }
        });
      });
    }

    /*
      Agency Summary — Stacked Bar Chart — Total IT Spending by Fiscal Year
    */
    if (document.getElementById('c3-total-spending')) {
      $.getJSON(totalSpendingUrl, function(totalSpendingData) {
        $.getJSON(majorSpendingUrl, function(majorSpendingData) {
          /*
            Transform JSON into C3-friendly format
          */
          var millions = false;
          var t = totalSpendingData.result;
          var m = majorSpendingData.result;
          var s = 0;
          var rows = [
            ['Fiscal Year', 'Total IT Spending on Major Investments', 'Total IT Spending on Non-Major Investments']
          ];
          for (var i = 0; i < t.length; i++) {
            var majP = m[i].pctSpendingGovwide / 100;
            var nonP = 1 - majP;
            var tot = t[i].dollarSpendingGovwide;
            var maj = tot * majP;
            var non = tot * nonP;
            s = (tot > s) ? tot : s;
            if (tot < 1000) {
                millions = true;
            }
            rows.push([t[i].fiscalYear, maj, non]);
          }
          var fact = (s > 10000) ? 10000 : 1000;
          // var ceil = Math.ceil(s / fact) * fact;
          var ceil = Math.ceil(s * 1.05);
          /*
            Initialize C3 chart
          */
          majorSpending = c3.generate({
            bindto: '#c3-total-spending',
            size: {
              height: h.barStacked
            },
            data: {
              type: 'bar',
              rows: rows,
              x: 'Fiscal Year',
              keys: {
                x: 'Fiscal Year',
                value: ['Total IT Spending on Major Investments', 'Total IT Spending on Non-Major Investments']
              },
              colors: {
                'Total IT Spending on Major Investments': c.blue,
                'Total IT Spending on Non-Major Investments': c.orange
              },
              groups: [
                ['Total IT Spending on Major Investments', 'Total IT Spending on Non-Major Investments']
              ],
              labels: {
                format: function (v, id, i, j) {
                  if (millions) {
                    return '$' + (v).toFixed(1) + 'M';
                  } else {
                    return '$' + (v / 1000).toFixed(1) + 'B';
                  }
                }
              },
              order: false
            },
            axis: {
              x: {
                label: {
                  text: 'Fiscal Year',
                  position: 'outer-center'
                },
                type: 'category',
                tick: {
                  format: function (i) {
                    var $$ = this, config = $$.config;
                    return 'FY' + config.axis_x_categories[i];
                  },
                  multiline: false,
                  rotate: -45
                }
              },
              y: {
                label: {
                  text: 'Total IT Spending ($)',
                  position: 'outer-middle'
                },
                max: ceil,
                padding: {
                  top: 0,
                  bottom: 0
                },
                tick: {
                  count: 5,
                  format: function (d) {
                    if (millions) {
                        return (d).toFixed(1) + 'M';   
                    } else {
                        return (d / 1000).toFixed(1) + 'B';
                    }
                  }
                }
              }
            },
            grid: {
              y: {
                show: true
              }
            },
            tooltip: {
              contents: function (d, defaultTitleFormat, defaultValueFormat, color) {
                var $$ = this, config = $$.config,
                titleFormat = config.tooltip_format_title || defaultTitleFormat,
                text, i, j, k, title,
                keys, p, tval;

                for (i = 0; i <= d.length; i++) {
                  if (! (d[i] && (d[i].value || d[i].value === 0))) { continue; }
                  title = titleFormat ? titleFormat(d[i].x) : d[i].x;
                  keys = [];
                  tval = d[0].value + d[1].value;
                  p = config.data_colors;
                  j = 0;
                  for (var key in p) {
                    if (p.hasOwnProperty(key)) {
                      keys.push([key, p[key], d[j].value, d[j].value / tval]);
                      j++;
                    }
                  }
                  keys = keys.reverse();
                  text = "<table class='" + $$.CLASS.tooltip + "'><thead>";
                  text += "<tr><th colspan='2'>" + title + "</th></tr>";
                  if (millions) {
                    text += "<tr><th colspan='2'>Total IT Spending: <strong>$" + (tval).toFixed(1) + "M</th></tr>";
                  } else {
                    text += "<tr><th colspan='2'>Total IT Spending: <strong>$" + (tval / 1000).toFixed(1) + "B</th></tr>";
                  }
                  text += "</thead><tbody>";
                  for (k = 0; k < keys.length; k++) {
                    text += "<tr>";
                    text += "<td class='name'><span style='background-color:" + keys[k][1] + "'></span>" + keys[k][0] + "</td>";
                    text += "</tr>";
                    if (millions) {
                        text += "<tr><td class='value'><strong>$" + (keys[k][2]).toFixed(1) + "M (" + (keys[k][3] * 100).toFixed(1) + "%)</strong></td></tr>";
                    } else {
                        text += "<tr><td class='value'><strong>$" + (keys[k][2] / 1000).toFixed(1) + "B (" + (keys[k][3] * 100).toFixed(1) + "%)</strong></td></tr>";
                    }
                  }
                  text += "</tbody></table>";
                }
                return text;
              }
            },
            padding: {
              top: 10,
              right: 5,
              bottom: 70,
              left: 90
            },
            legend: {
              show: false
            },
            onrendered: function () {
              var $$ = this, config = $$.config;
              var dataNames = config.data_keys.value;
              dataNames = dataNames.reverse();
              var dataColors = config.data_colors;
              var wrapper = document.getElementById('c3-total-spending');
              var parent = wrapper.parentNode;

              var xAxisLabel = document.querySelector('#c3-total-spending .c3-axis-x-label'),
                  transform = getComputedStyle(xAxisLabel).getPropertyValue('transform');
              xAxisLabel.setAttribute('transform', transform);

              /*
                Create custom legend as C3 legends tend to overlap in Firefox/IE/Edge
              */
              if (!parent.querySelector('.c3-legend-custom')) {
                var legend = document.createElement('ul');
                legend.classList.add('c3-legend-custom');
                legend.setAttribute('aria-hidden', 'true');
                var legendItems = '';
                Object.keys(dataNames).forEach(function(key) {
                  var keyName = dataNames[key];
                  legendItems += '<li><span style="background-color: ' + dataColors[keyName] + '"></span>' + dataNames[key] + '</li>';
                });
                legend.innerHTML = legendItems;
                parent.appendChild(legend);
              }

              /*
                Add hidden data table for 508 compliance
              */
              if (!parent.querySelector('.c3-data-table')) {
                parent.setAttribute('aria-label', 'A chart.');
                wrapper.setAttribute('aria-hidden', 'true');
                var table = '<table class="c3-data-table" aria-label="A tabular view of the data in the chart."><thead><tr>';
                table += '<th>' + rows[0][0] + '</th>';
                table += '<th>' + rows[0][1] + '</th>';
                table += '<th>' + rows[0][2] + '</th>';
                table += '</tr></thead><tbody>';
                var rowCount = 0;
                rows.forEach(function(row) {
                  if (rowCount++ > 0) {
                    table += '<tr><th>FY' + row[0] + '</th>';
                    if (millions) {
                        table += '<td>$' + (row[1]).toFixed(1) + 'M</td>';
                        table += '<td>$' + (row[2]).toFixed(1) + 'M</td></tr>';
                    } else {
                        table += '<td>$' + (row[1] / 1000).toFixed(1) + 'B</td>';
                        table += '<td>$' + (row[2] / 1000).toFixed(1) + 'B</td></tr>';
                    }
                  }
                });
                table += '</tbody></table>';
                var tableWrapper = document.createElement('div');
                tableWrapper.innerHTML = table;
                parent.appendChild(tableWrapper);
              }

              /*
                Nudge labels down into bars
              */
              var barLabels = wrapper.querySelectorAll('.c3-chart-texts text');
              Array.prototype.forEach.call(barLabels, function(el, i){
                var oldY = Number(el.getAttribute('y'));
                var newY = oldY + 20;
                el.setAttribute('y', newY);
              });
            }
          });
        });
      });
    }

    /*
      Agency Summary — Table — Systems Development Life Cycle (SDLC) Methodology Highlights
    
    if (document.getElementById('sdlc-highlights')) {
      $.getJSON(sdlcMethodologyUrl, function(sdlcMethodologyData) {
        function sdlcMag(cost) {
          if (cost == 0 || cost == null) {
            return '—';
          } else if (cost < 1000) {
            return '$' + cost.toFixed(1) + 'M';
          } else {
            var bil = cost / 1000;
            return '$' + bil.toFixed(1) + 'B';
          }
        }
        function deNull(value, post) {
          var post = post+'';
          if (value == null) {
            return '—';
          } else {
            return value + post;
          }
        }
        var rows = sdlcMethodologyData.result;
        var table = '<table id="sdlc-highlights-table" class="table table-bordered table-striped sdlc-highlights-table"><thead><tr>';
        table += '<th>SDLC Methodology</th>';
        table += '<th class="text-center">Percent of Projects</th>';
        table += '<th class="text-center">Life Cycle Cost</th>';
        table += '<th class="text-center">Projects on Budget</th>';
        table += '<th class="text-center">Projects on Schedule</th>';
        table += '<th class="text-center">Average Project Duration</th>';
        table += '</tr></thead><tbody>';
        rows.forEach(function(row) {
          table += '<tr><th>' + deNull(row.SDLCMethodology) + '</th>';
          table += '<td>' + deNull(row.percentOfProjects, '%') + '</td>';
          table += '<td>' + sdlcMag(row.lifeCost) + '</td>';
          table += '<td>' + deNull(row.projectsOnBudget, '%') + '</td>';
          table += '<td>' + deNull(row.projectsOnSchedule, '%') + '</td>';
          table += '<td>' + deNull(row.averageProjectDuration, ' days') + '</td></tr>';
        });
        table += '</tbody></table>';

        sdlcMethodology = document.getElementById('sdlc-highlights');
        sdlcMethodology.outerHTML = table;

        var THarray = [];
        var tableEl = document.getElementById('sdlc-highlights-table');
        var ths = tableEl.getElementsByTagName('th');
        for (var i = 0; i < ths.length; i++) {
          var headingText = ths[i].innerHTML;
          THarray.push(headingText);
        }
        var styleElm = document.createElement('style'),
          styleSheet;
        document.head.appendChild(styleElm);
        styleSheet = styleElm.sheet;
        for (var j = 0; j < THarray.length; j++) {
          styleSheet.insertRule(
            '#sdlc-highlights-table td:nth-child(' +
              (j + 1) +
              ')::before {content:"' +
              THarray[j] +
              ': ";}',
            styleSheet.cssRules.length
          );
        }
      });
    }
*/
    /*
      Investment Summary — Donut Chart — Cost Variance
    */
    if (document.getElementById('c3-cost-variance')) {
      $.getJSON(costVarianceUrl, function(costVarianceData) {
        /*
          Variables for nicer name display
        */
        var cv = {
          red: 'Cost Variance ≥ 30%',
          yellow: 'Cost Variance ≥ 10% and &lt; 30%',
          green: 'Cost Variance &lt; 10%'
        };
        /*
          Initialize C3 chart
        */
        costVariance = c3.generate({
          bindto: '#c3-cost-variance',
          size: {
            height: h.donutSmall
          },
          data: {
            json: costVarianceData.result,
            type: 'donut',
            keys: {
              value: ['costVarianceRed', 'costVarianceYellow', 'costVarianceGreen']
            },
            names: {
              costVarianceRed: cv.red,
              costVarianceYellow: cv.yellow,
              costVarianceGreen: cv.green
            },
            colors: {
              costVarianceRed: c.red,
              costVarianceYellow: c.yellow,
              costVarianceGreen: c.green
            }
          },
          donut: {
            width: h.arcSmall,
            label: {
              show: false
            }
          },
          tooltip: {
            contents: function (d, defaultTitleFormat, defaultValueFormat, color) {
              var $$ = this, config = $$.config,
              nameFormat = config.tooltip_format_name || function (name) { return name; },
              valueFormat = config.tooltip_format_value || defaultValueFormat,
              text, i, value, name, bgcolor;

              for (i = 0; i < d.length; i++) {
                if (! (d[i] && (d[i].value || d[i].value === 0))) { continue; }

                switch (d[i].id) {
                  case 'costVarianceRed':
                  name = cv.red;
                  break;
                  case 'costVarianceYellow':
                  name = cv.yellow;
                  break;
                  case 'costVarianceGreen':
                  name = cv.green;
                  break;
                  default:
                  name = nameFormat(d[i].name);
                }
                value = valueFormat(d[i].value, d[i].ratio, d[i].id, d[i].index);
                bgcolor = $$.levelColor ? $$.levelColor(d[i].value) : color(d[i].id);

                var tableClass = $$.CLASS.tooltip,
                    rowClass = $$.CLASS.tooltipName + "-" + d[i].id;
                text = tooltipBasic(tableClass, rowClass, bgcolor, name, value);
              }
              return text;
            },
            format: {
              value: function (value, ratio, id) {
                return 'Projects: <strong>' + value + '</strong>';
              }
            }
          },
          legend: {
            show: false
          },
          onrendered: function () {
            var $$ = this, config = $$.config;
            var dataNames = config.data_names;
            var dataColors = config.data_colors;
            var dataJson = config.data_json;
            var wrapper = document.getElementById('c3-cost-variance');
            var parent = wrapper.parentNode;

            /*
              Create custom legend as C3 legends tend to overlap in Firefox/IE/Edge
            */
            if (!parent.querySelector('.c3-legend-custom')) {
              var legend = document.createElement('ul');
              legend.classList.add('c3-legend-custom');
              legend.setAttribute('aria-hidden', 'true');
              var legendItems = '';
              Object.keys(dataNames).forEach(function(key) {
                legendItems += '<li><span style="background-color: ' + dataColors[key] + '"></span>' + dataNames[key] + '</li>';
              });
              legend.innerHTML = legendItems;
              parent.appendChild(legend);
            }

            /*
              Add hidden data table for 508 compliance
            */
            if (!parent.querySelector('.c3-data-table')) {
              parent.setAttribute('aria-label', 'A chart.');
              wrapper.setAttribute('aria-hidden', 'true');
              var table = '<table class="c3-data-table" aria-label="A tabular view of the data in the chart."><thead></th>';
              var red = config.data_json[0].costVarianceRed,
                  yellow = config.data_json[0].costVarianceYellow,
                  green = config.data_json[0].costVarianceGreen,
                  total = red + yellow + green;
              var ratioRed = ((red / total) * 100).toFixed(1),
                  ratioYellow = ((yellow / total) * 100).toFixed(1),
                  ratioGreen = ((green / total) * 100).toFixed(1);
              for (var header in config.data_names) {
                table += '<th>' + config.data_names[header] + '</th>';
              }
              table += '</tr></thead><tbody>';
              table += '<tr><td>' + ratioRed + '% (' + red + ' projects)</td><td>' + ratioYellow + '% (' + yellow + ' projects)</td><td>' + ratioGreen + '% (' + green + ' projects)</td></tr>';
              table += '</tbody></table>';
              wrapper.insertAdjacentHTML('afterend', table);
            }
          }
        });
      });
    }

    /*
      Investment Summary — Donut Chart — Schedule Variance
    */
    if (document.getElementById('c3-schedule-variance')) {
      $.getJSON(scheduleVarianceUrl, function(scheduleVarianceData) {
        /*
          Variables for nicer name display
        */
        var sv = {
          red: 'Schedule Variance ≥ 30%',
          yellow: 'Schedule Variance ≥ 10% and &lt; 30%',
          green: 'Schedule Variance &lt; 10%'
        };
        /*
          Initialize C3 chart
        */
        scheduleVariance = c3.generate({
          bindto: '#c3-schedule-variance',
          size: {
            height: h.donutSmall
          },
          data: {
            json: scheduleVarianceData.result,
            type: 'donut',
            keys: {
              value: ['scheduleVarianceRed', 'scheduleVarianceYellow', 'scheduleVarianceGreen']
            },
            names: {
              scheduleVarianceRed: sv.red,
              scheduleVarianceYellow: sv.yellow,
              scheduleVarianceGreen: sv.green
            },
            colors: {
              scheduleVarianceRed: c.red,
              scheduleVarianceYellow: c.yellow,
              scheduleVarianceGreen: c.green
            }
          },
          donut: {
            width: h.arcSmall,
            label: {
              show: false
            }
          },
          tooltip: {
            contents: function (d, defaultTitleFormat, defaultValueFormat, color) {
              var $$ = this, config = $$.config,
              nameFormat = config.tooltip_format_name || function (name) { return name; },
              valueFormat = config.tooltip_format_value || defaultValueFormat,
              text, i, value, name, bgcolor;

              for (i = 0; i < d.length; i++) {
                if (! (d[i] && (d[i].value || d[i].value === 0))) { continue; }

                switch (d[i].id) {
                  case 'scheduleVarianceRed':
                  name = sv.red;
                  break;
                  case 'scheduleVarianceYellow':
                  name = sv.yellow;
                  break;
                  case 'scheduleVarianceGreen':
                  name = sv.green;
                  break;
                  default:
                  name = nameFormat(d[i].name);
                }
                value = valueFormat(d[i].value, d[i].ratio, d[i].id, d[i].index);
                bgcolor = $$.levelColor ? $$.levelColor(d[i].value) : color(d[i].id);

                var tableClass = $$.CLASS.tooltip,
                    rowClass = $$.CLASS.tooltipName + "-" + d[i].id;
                text = tooltipBasic(tableClass, rowClass, bgcolor, name, value);
              }
              return text;
            },
            format: {
              value: function (value, ratio, id) {
                return 'Projects: <strong>' + value + '</strong>';
              }
            }
          },
          legend: {
            show: false
          },
          onrendered: function () {
            var $$ = this, config = $$.config;
            var dataNames = config.data_names;
            var dataColors = config.data_colors;
            var dataJson = config.data_json;
            var wrapper = document.getElementById('c3-schedule-variance');
            var parent = wrapper.parentNode;

            /*
              Create custom legend as C3 legends tend to overlap in Firefox/IE/Edge
            */
            if (!parent.querySelector('.c3-legend-custom')) {
              var legend = document.createElement('ul');
              legend.classList.add('c3-legend-custom');
              legend.setAttribute('aria-hidden', 'true');
              var legendItems = '';
              Object.keys(dataNames).forEach(function(key) {
                legendItems += '<li><span style="background-color: ' + dataColors[key] + '"></span>' + dataNames[key] + '</li>';
              });
              legend.innerHTML = legendItems;
              parent.appendChild(legend);
            }

            /*
              Add hidden data table for 508 compliance
            */
            if (!parent.querySelector('.c3-data-table')) {
              parent.setAttribute('aria-label', 'A chart.');
              wrapper.setAttribute('aria-hidden', 'true');
              var table = '<table class="c3-data-table" aria-label="A tabular view of the data in the chart."><thead></th>';
              var red = config.data_json[0].scheduleVarianceRed,
                  yellow = config.data_json[0].scheduleVarianceYellow,
                  green = config.data_json[0].scheduleVarianceGreen,
                  total = red + yellow + green;
              var ratioRed = ((red / total) * 100).toFixed(1),
                  ratioYellow = ((yellow / total) * 100).toFixed(1),
                  ratioGreen = ((green / total) * 100).toFixed(1);
              for (var header in config.data_names) {
                table += '<th>' + config.data_names[header] + '</th>';
              }
              table += '</tr></thead><tbody>';
              table += '<tr><td>' + ratioRed + '% (' + red + ' projects)</td><td>' + ratioYellow + '% (' + yellow + ' projects)</td><td>' + ratioGreen + '% (' + green + ' projects)</td></tr>';
              table += '</tbody></table>';
              wrapper.insertAdjacentHTML('afterend', table);
            }
          }
        });
      });
    }

    /*
      Investment Summary — Bar Chart (Interactive) — CIO Rating History
    */
    if (document.getElementById('c3-cio-rating-history')) {
      $.getJSON(cioRatingHistoryUrl, function(cioRatingHistoryData) {
        /*
          Sort data
        */
        var sorted = sortJSON(cioRatingHistoryData.result, 'ratedDate', '123');

        /*
          Initialize C3 chart
        */
        cioRatingHistory = c3.generate({
          bindto: '#c3-cio-rating-history',
          size: {
            height: h.bar
          },
          data: {
            json: sorted,
            type: 'bar',
            keys: {
              x: 'ratedDate',
              value: ['ratedDate', 'cioRating']
            },
            colors: {
              'cioRating': function(d) {
                switch (d.value) {
                  case 5:
                  case 4:
                    return c.green;
                  case 3:
                    return c.yellow;
                  default:
                    return c.red;
                }
              }
            }
          },
          axis: {
            x: {
              type: 'category',
              tick: {
                format: function(x) {
                  var $$ = this, config = $$.config;
                  var justDate = config.data_json[x].ratedDate.substring(0,10);
                  return(justDate);
                },
                multiline: false,
                rotate: -45
              }
            },
            y: {
              label: {
                text: 'CIO Rating',
                position: 'outer-middle'
              },
              min: 0,
              max: 5,
              padding: {
                top: 0,
                bottom: 0
              },
              tick: {
                count: 6,
                values: [0, 1, 2, 3, 4, 5]
              }
            }
          },
          grid: {
            y: {
              show: true
            }
          },
          tooltip: {
            contents: function (d, defaultTitleFormat, defaultValueFormat, color) {
              var $$ = this, config = $$.config,
              valueFormat = config.tooltip_format_value || defaultValueFormat,
              text, i, value, title, bgcolor;

              for (i = 0; i < d.length; i++) {
                if (! (d[i] && (d[i].value || d[i].value === 0))) { continue; }

                switch (d[i].value) {
                  case 5:
                  case 4:
                    title = 'Low Risk';
                    bgcolor = c.green;
                    break;
                  case 3:
                    title = 'Medium Risk';
                    bgcolor = c.yellow;
                    break;
                  default:
                    title = 'High Risk';
                    bgcolor = c.red;
                }
                value = valueFormat(d[i].value, d[i].ratio, d[i].id, d[i].index);

                text = "<table class='" + $$.CLASS.tooltip + "'><thead>";
                text += "<tr><th style='color: " + bgcolor + "'>" + title + "</th></tr>";
                text += "</thead><tbody>";
                text += "<tr class='" + $$.CLASS.tooltipName + "-" + d[i].id + "'>";
                text += "<td class='value'>" + value + "</td>";
                text += "</tr>";
                text += "</tbody></table>";
              }
              return text;
            }
          },
          legend: {
            show: false
          },
          padding: {
            top: 10,
            right: 5,
            bottom: 90,
            left: 60
          }
        });
      });

      /*
        From rating_history.js
      */
      function getMonthFromString(month, year) {
        return new Date(Date.parse(month +' 1, ' + year)).getMonth() + 1;
      }

      function getLastDayOfMonth(month, year) {
        return moment(year + '-' + month + '-01', 'YYYY-MM-DD').endOf('month').format('D');
      }

      function isoToShortDate(date) {
        var shortDateParts = date.toISOString().substr(0, 10).split('-');
        var shortDateRaw = new Date(shortDateParts[0],shortDateParts[1]-1,shortDateParts[2]);
        var shortDateMonth = shortDateRaw.toLocaleString('en-us', { month: "short" });
        var shortDateYear = shortDateRaw.toLocaleString('en-us', { year: "numeric" });
        return shortDateMonth + ' ' + shortDateYear;
      }

      function shortToIsoDate(date, firstLast) {
        var isoDateYear = date.substr(0, 4);
        var isoDateMonth = date.substr(5, 2);
        var isoDateDay = firstLast == 'first' ? '01' : getLastDayOfMonth(isoDateMonth, isoDateYear);
        var isoDate = date + '-' + isoDateDay;
        return isoDate;
      }

      function setDatePicker(uii, startDate, endDate) {
        $('#uii').val(uii);
        $('#ratingStartDate').val(startDate);
        $('#ratingEndDate').val(endDate);

        // Initialize datepicker widget
        $('.input-group.date').datepicker({
          autoclose: true,
          endDate: '0d',
          format: "yyyy-mm",
          startView: "years",
          minViewMode: "months"
        });
      }

      function getCurrentRating(uii, startDate, endDate) {

        var currentRating = $('#current-rating');

        // Import data
        var dataUrl = '/api/v1/ITDB2/visualization/investment/cioRatingTrend/uii/' + uii + '/startDate/' + startDate + '/endDate/' + endDate + '/groupBy/month';

        $.getJSON(dataUrl, function(data) {

          var textRatings = '';
          var ratingsObj = data.result;
          ratingsObj.sort(function(a,b) { return (a.ratedDate < b.ratedDate) ? 1 : ((b.ratedDate < a.ratedDate) ? -1 : 0); } );
          var rating = ratingsObj[0];
          if (rating) {
            textRatings += '<div class="row">';
            textRatings += '<div class="col-xs-2 col-sm-1">';
            textRatings += '<span class="cio-rating-square rating-value-' + rating.cioRating + '">' + rating.cioRating + '</span>';
            textRatings += '</div>';
            textRatings += '<div class="col-xs-10 col-sm-11">';
            textRatings += '<h4 class="rating-history-date">' + rating.ratedDate + '</h4>';
            textRatings += '<p><strong>Comment:</strong> ' + rating.comments + '</p>';
            textRatings += '</div>';
            textRatings += '</div>';
          }
          currentRating.html(textRatings);

        });

      }

      function getRatingData(uii, startDate, endDate) {

        var ratingsBlock = $('#ratings-block');
        var ratingsTable = $('#table-rating-history tbody');

        // Import data
        var dataUrl = '/api/v1/ITDB2/visualization/investment/cioRatingTrend/uii/' + uii + '/startDate/' + startDate + '/endDate/' + endDate + '/groupBy/month';

        $.getJSON(dataUrl, function(data) {

          var ratingsObj = data.result;
          ratingsObj.sort(function(a,b) { return (a.ratedDate < b.ratedDate) ? 1 : ((b.ratedDate < a.ratedDate) ? -1 : 0); } );

          var sorted = sortJSON(data.result, 'ratedDate', '123');
          if (cioRatingHistory) {
            cioRatingHistory.internal.config.data_json = sorted;
            cioRatingHistory.load({
              unload: true,
              json: sorted,
              keys: {
                x: 'ratedDate',
                value: ['ratedDate', 'cioRating']
              }
            });
          }

        });

        var dataUrlAll = '/api/v1/ITDB2/visualization/investment/cioRatingTrend/uii/' + uii + '/startDate/' + startDate + '/endDate/' + endDate + '/groupBy/none';

        $.getJSON(dataUrlAll, function(data) {

          var textRatings = '';
          var ratingsObj = data.result;
          ratingsObj.sort(function(a,b) { return (a.ratedDate > b.ratedDate) ? 1 : ((b.ratedDate > a.ratedDate) ? -1 : 0); } );

          $.each(ratingsObj, function(index, rating) {

            textRatings += '<div class="row">';
            textRatings += '<div class="col-xs-2 col-sm-1">';
            textRatings += '<span class="cio-rating-square rating-value-' + rating.cioRating + '">' + rating.cioRating + '</span>';
            textRatings += '</div>';
            textRatings += '<div class="col-xs-10 col-sm-11">';
            textRatings += '<h4 class="rating-history-date">' + rating.ratedDate + '</h4>';
            textRatings += '<p><strong>Comment:</strong> ' + rating.comments + '</p>';
            textRatings += '</div>';
            textRatings += '</div>';

          });

          ratingsBlock.html(textRatings);

        });

      }

      $('#ratingDatePicker').submit(function(event) {
        var newStartDate = shortToIsoDate($('#ratingStartDate').val(), 'first');
        var newEndDate = shortToIsoDate($('#ratingEndDate').val(), 'last');
        var uii = $('#uii').val();
        getRatingData(uii, newStartDate, newEndDate);
        event.preventDefault();
      });

      var today = new Date();
      var before = new Date();
      var defaultRangeMonths = 11;
      var defaultEndDateYear = today.getFullYear();
      var defaultEndDateMonth = today.getMonth() + 1;
      if ( defaultEndDateMonth < 10 ) { defaultEndDateMonth = '0' + defaultEndDateMonth; }
      var defaultEndDateDay = today.getDate();
      if ( defaultEndDateDay < 10 ) { defaultEndDateDay = '0' + defaultEndDateDay; }
      var defaultEndDate = defaultEndDateYear + '-' + defaultEndDateMonth + '-' + defaultEndDateDay;
      before.setMonth(before.getMonth() - defaultRangeMonths);
      var defaultStartDateYear = before.getFullYear();
      var defaultStartDateMonth = before.getMonth() + 1;
      if ( defaultStartDateMonth < 10 ) { defaultStartDateMonth = '0' + defaultStartDateMonth; }
      var defaultStartDateDay = 1;
      if ( defaultStartDateDay < 10 ) { defaultStartDateDay = '0' + defaultStartDateDay; }
      var defaultStartDate = defaultStartDateYear + '-' + defaultStartDateMonth + '-' + defaultStartDateDay;
      var uii = $('#uii').val();
      setTimeout(function() {
        getCurrentRating(uii, defaultStartDate, defaultEndDate);
        getRatingData(uii, defaultStartDate, defaultEndDate);
      }, 1000);

      var endDateSet = today.toISOString().substr(0, 7);
      var startDateSet = before.toISOString().substr(0, 7);
      setDatePicker(uii, startDateSet, endDateSet);
    }

    /*
      Cost Savings — Stacked Area Chart — Cumulative Combined Cost Savings
    */
    if (document.getElementById('c3-cost-savings-combined')) {
      $.getJSON(costSavingsOmbUrl, function(costSavingsOmbData) {
        $.getJSON(costSavingsOtherUrl, function(costSavingsOtherData) {
          $.getJSON(costSavingsTargetUrl, function(costSavingsTargetData) {
            $.getJSON(costSavingsMissDataUrl, function(costSavingsMissData) {
              $.getJSON(costSavingsMissNonDataUrl, function(costSavingsMissNonData) {

                /*
                  Transform JSON into C3-friendly format
                */
                var d = costSavingsOmbData.result,
                    o = costSavingsOtherData.result,
                    t = costSavingsTargetData.result,
                    mdc = costSavingsMissData.result,
                    mndc = costSavingsMissNonData.result,
                    munion,
                    mAgency = false,
                    dYear = d[0] ? d[0].fiscalYear : null,
                    oYear = o[0] ? o[0].fiscalYear : null,
                    tYear = thisYear,
                    y = Math.max(Math.min(dYear, oYear, tYear), initYear),
                    n = tYear - y,
                    last = 0,
                    lastOmb = 0,
                    lastOther = 0,
                    dTot = 0,
                    oTot = 0,
                    mMax = 0,
                    ombMax = 0,
                    otherMax = 0,
                    targ,
                    target,
                    labelTot;
                var cols = [
                  ['Fiscal Year'],
                  ['PortfolioStat and Other Savings'],
                  ['DCOI Savings'],
                  ['OMB Policy Target']
                ];
                var cats = [];
                if (agencyCode === '000') {
                  munion = union(mdc, mndc);
                } else {
                  mAgency = (d.length === 0 || o.length === 0) ? true : false;
                }
                for (var j = 0; j < t.length; j++) {
                  if (t[j].agencyCode == agencyCode) {
                    targ = t[j].allSavingsPolicyTarget ? t[j].allSavingsPolicyTarget : null;
                  }
                }
                for (var i = 0; i <= n; i++) {
                  var fy = 'FY' + y++,
                      omb = (d[i] && d[i] !== null) ? d[i].amount : null,
                      other = (o[i] && o[i] !== null) ? o[i].amount : null;
                  target = (i == n) ? targ : null;
                  target = target ? target : null;
                  cats.push(fy);
                  cols[0].push(fy);
                  var otherTop = oTot += other;
                  var thisOther = (other !== null) ? otherTop : null;
                  lastOther = (other !== null) ? i : lastOther;
                  cols[1].push(thisOther);
                  otherMax = Math.max(otherMax, otherTop);
                  var ombTop = dTot += omb;
                  var thisOmb = (omb !== null) ? ombTop : null;
                  lastOmb = (omb !== null) ? i : lastOmb;
                  cols[2].push(thisOmb);
                  ombMax = Math.max(ombMax, ombTop);
                  last = i;
                  cols[3].push(target);
                  mMax = Math.max(mMax, oTot + dTot, target);
                  mMax = mMax * 1.1;
                }
                if (cols[3][n + 1] === null) {
                  cols[3][n + 1] = 0;
                }

                /*
                  Calculate magnitude/ceiling for chart
                */
                var valueTop = Math.max(ombMax, otherMax, target);
                var mag = (valueTop >= 1000) ? 'B' : 'M';
                var miniMag = (valueTop <= 100) ? true : false;
                var ceil = (mag == 'B') ? Math.ceil(mMax / 1000) * 1000 : miniMag ? Math.ceil(mMax / 10) * 10 : Math.ceil(mMax / 100) * 100;
                ceil = (ceil > 0) ? ceil : 10;
                var count = (valueTop > 0) ? 5 : 2;

                /*
                  Initialize C3 chart
                */
                costSavingsCombined = c3.generate({
                  bindto: '#c3-cost-savings-combined',
                  size: {
                    height: h.area
                  },
                  data: {
                    type: 'area',
                    x: 'Fiscal Year',
                    columns: cols,
                    colors: {
                      'DCOI Savings': c.blue,
                      'PortfolioStat and Other Savings': c.orange,
                      'OMB Policy Target': c.red
                    },
                    groups: [
                      ['DCOI Savings', 'PortfolioStat and Other Savings']
                    ],
                    labels: {
                      format: function (v, id, i, j) {
                        var labelVal = '',
                            vTot = 0;
                        if (i == lastOther && id == 'PortfolioStat and Other Savings' && v > 0) {
                          if (v) {
                            labelVal = (mag == 'B') ? '$' + (v / 1000).toFixed(1) + 'B' : '$' + v.toFixed(1) + 'M';
                          }
                          labelTot = v;
                        } else if (i == lastOmb && id == 'DCOI Savings' && v > 0) {
                          vTot = labelTot + v;
                          if (vTot) {
                            labelVal = (mag == 'B') ? '$' + (vTot / 1000).toFixed(1) + 'B' : '$' + v.toFixed(1) + 'M';
                          }
                        }
                        return labelVal;
                      }
                    },
                    order: false
                  },
                  axis: {
                    x: {
                      type: 'category',
                      categories: cats,
                      tick: {
                        multiline: false,
                        rotate: -45
                      }
                    },
                    y: {
                      label: {
                        text: 'Cumulative Combined Cost Savings ($)',
                        position: 'outer-middle'
                      },
                      max: ceil,
                      padding: {
                        top: 0,
                        bottom: 0
                      },
                      tick: {
                        count: count,
                        format: function (d) {
                          var round = (mag == 'B') ? (d / 1000).toFixed(1) : d.toFixed(0);
                          var ret = (d > 0) ? '$' + round + mag : 0;
                          return ret;
                        }
                      }
                    }
                  },
                  grid: {
                    y: {
                      show: true
                    }
                  },
                  point: {
                    r: 5
                  },
                  padding: {
                    top: 10,
                    right: 20,
                    bottom: 60,
                    left: 90
                  },
                  tooltip: {
                    contents: function (d, defaultTitleFormat, defaultValueFormat, color) {
                      var $$ = this, config = $$.config,
                      nameFormat = config.tooltip_format_name || function (name) { return name; },
                      valueFormat = config.tooltip_format_value || defaultValueFormat,
                      text, i, value, name, bgColor, year, totalValue;
                      var rows = '', total = 0;

                      for (i = d.length; i >= 0; i--) {
                        if (! (d[i] && (d[i].value || d[i].value === 0))) { continue; }

                        var x = d[i].x;
                        year = config.axis_x_categories[x];
                        name = nameFormat(d[i].name);
                        value = valueFormat(d[i].value, d[i].ratio, d[i].id, d[i].index);
                        if (name != 'OMB Policy Target') {
                          total += d[i].value;
                        }

                        bgColor = $$.levelColor ? $$.levelColor(d[i].value) : color(d[i].id);

                        var tableClass = $$.CLASS.tooltip,
                            rowClass = $$.CLASS.tooltipName + "-" + d[i].id;

                        rows += "<tr class='" + rowClass + "'>";
                        rows += "<td class='name'><span style='background-color:" + bgColor + "'></span>" + name + "</td>";
                        rows += "<td class='value'>" + value + "</td>";
                        rows += "</tr>";
                      }
                      text = "<table class='" + tableClass + "'><thead>";
                      text += "<tr><th colspan='2'>" + year + "</th></tr></thead>";
                      text += "<tbody><tr class='total'>";
                      if (total) {
                        totalValue = valueFormat(total);
                        text += "<td class='name'><span style='border-color: #7cb5ec #ffa100 #ffa100 #7cb5ec;'></span>Cumulative Combined Cost Savings</td>";
                        text += "<td class='value'>" + totalValue + "</td>";
                        text += "</tr>";
                      }
                      text += rows + "</tbody></table>";
                      return text;
                    },
                    format: {
                      value: function (d) {
                        var round = (mag == 'B') ? d / 1000 : d;
                        return '$' + round.toFixed(1) + mag;
                      }
                    }
                  },
                  legend: {
                    show: false
                  },
                  onrendered: function () {
                    var $$ = this, config = $$.config;
                    var dataColors = config.data_colors;
                    var wrapper = document.getElementById('c3-cost-savings-combined');
                    var parent = wrapper.parentNode;
                    var warning = '';

                    /*
                      Add warning if there is missing data
                    */
                    if (agencyCode === '000' && munion) {
                      if (!parent.parentNode.querySelector('.usa-alert-warning')) {
                        warning = '<div class="usa-alert usa-alert-warning text-left">';
                        warning += '<div class="usa-alert-body"><h3 class="usa-alert-heading">Warning</h3>';
                        warning += '<div class="usa-alert-text"><p>There is incomplete, improperly formatted, or missing data for the following agencies: ' + munion.join(', ') + '</p></div></div>';
                        parent.insertAdjacentHTML('beforebegin', warning);
                      }
                    }
                    if (agencyCode !== '000' && mAgency) {
                      if (!parent.parentNode.querySelector('.usa-alert-warning')) {
                        warning = '<div class="usa-alert usa-alert-warning text-left">';
                        warning += '<div class="usa-alert-body"><h3 class="usa-alert-heading">Warning</h3>';
                        warning += '<div class="usa-alert-text"><p>This agency’s data cannot be displayed. It is either unavailable at the agency’s website or improperly formatted.</p></div></div>';
                        parent.insertAdjacentHTML('beforebegin', warning);
                      }
                    }

                    /*
                      Create custom legend as C3 legends tend to overlap in Firefox/IE/Edge
                    */
                    if (!parent.querySelector('.c3-legend-custom')) {
                      var legend = document.createElement('ul');
                      legend.classList.add('c3-legend-custom');
                      legend.setAttribute('aria-hidden', 'true');
                      var legendItems = '';
                      var i = 1;
                      Object.keys(dataColors).forEach(function(key) {
                        var arr = config.data_columns[i];
                        var nully = 0;
                        for (var j = 1; j < arr.length; j++) {
                          if (arr[j] !== null) {
                            nully++;
                          }
                        }
                        if (nully > 0) {
                          legendItems += '<li><span style="background-color: ' + dataColors[key] + '"></span>' + key + '</li>';
                        }
                        i++;
                      });
                      legend.innerHTML = legendItems;
                      parent.appendChild(legend);
                    }

                    /*
                      Add hidden data table for 508 compliance
                    */
                    if (!parent.querySelector('.c3-data-table')) {
                      parent.setAttribute('aria-label', 'A chart.');
                      wrapper.setAttribute('aria-hidden', 'true');
                      var table = '<table class="c3-data-table" aria-label="A tabular view of the data in the chart."><thead></td>';
                      for (var row in config.data_columns) {
                        table += '<th>' + config.data_columns[row][0] + '</th>';
                      }
                      table += '</tr></thead><tbody>';
                      var rnd = function(val) {
                        var bil = val / 1000;
                        switch(true) {
                          case val == 0 || val == null:
                            return '—';
                          case val < 1000:
                            return '$' + val.toFixed(1) + 'M';
                          case val >= 1000:
                            return '$' + bil.toFixed(1) + 'B';
                        }
                      };
                      for (var i = 1; i < config.data_columns[0].length; i++) {
                        var dcoi = rnd(config.data_columns[1][i]);
                        var other = rnd(config.data_columns[2][i]);
                        var target = rnd(config.data_columns[3][i]);
                        table += '<tr><th>' + config.data_columns[0][i] + '</th><td>' + dcoi + '</td><td>' + other + '</td><td>' + target + '</td></tr>';
                      }
                      table += '</tbody></table>';
                      wrapper.insertAdjacentHTML('afterend', table);
                    }
                  }
                });
              });
            });
          });
        });
      });
    }

  /* Data Center Closure Progress */

  if (document.getElementById('c3-data-center-closure-progress-combined')) {

    // remove unneeded agency elements

    $('#agency-selector').find('[value="393"]').remove();
    $('#agency-selector').find('[value="202"]').remove();
    
    $.getJSON(dataCenterClosureProgressUrl, function(dataCenterClosureProgressData) {

        var dates = ['x'];

        var numClosed = ['# of Closures'];
        var numOpenNotKeyMission = ['# of Open Non-KMFs'];
        var numOpenKeyMission = ['# of Open KMFs'];
        var targetClosures = 0;

        $.each(dataCenterClosureProgressData, function(key, value) {
            dates.push(key+'-01-01');
            $.each(value, function(k, v) {
                if (k == 'numClosedDC') numClosed.push(v);
                if (k == 'numKeyMissionFac') numOpenKeyMission.push(v);
                if (k == 'numNonKeyMissionFac') numOpenNotKeyMission.push(v);
                if (k == 'targetClosures') targetClosures = v;  // this right now only shows up in 2018 -- when 2019 comes around, make sure the target closures is in the 2019 row of data from the SP
            });
        });

        var lines = [];
        if (agencyCode !== '000') {
            lines.push (
            {
                value: targetClosures,
                class: 'grid-dcoi',
                text: 'DCOI Closure Goal: '+targetClosures 
            }
            );
        }

        let dataCenterClosureProgressChart = c3.generate({
            bindto: '#c3-data-center-closure-progress-combined',
            size: {
              height: h.barStacked
            },
            padding: {
                bottom: 20
            },
            tooltip: {
                contents: function (d, defaultTitleFormat, defaultValueFormat, color) {

                    var $$ = this, config = $$.config,
                    nameFormat = config.tooltip_format_name || function (name) { return name; },
                    titleFormat = config.tooltip_format_title || defaultTitleFormat,
                    valueFormat = config.tooltip_format_value || defaultValueFormat,
                    text, i, value, name, bgcolor;

                    var openKMFtext, openNonKMFtext, closuretext = '';

                    for (i = 0; i < d.length; i++) {
                        if (! (d[i] && (d[i].value || d[i].value === 0))) { continue; }
                        title = titleFormat ? titleFormat(d[i].x) : d[i].x;
                        name = nameFormat(d[i].name);
                        value = valueFormat(d[i].value, d[i].ratio, d[i].id, d[i].index);
                        bgColor = $$.levelColor ? $$.levelColor(d[i].value) : color(d[i].id);

                        var tableClass = $$.CLASS.tooltip,
                            rowClass = $$.CLASS.tooltipName + "-" + d[i].id;

                        if (name == '# of Open KMFs') {
                            openKMFtext = "<td class='name'><span style='background-color:" + bgColor + "'></span>" + name + ": </td><td class='value'>" + value + "</td>";
                        }
                        if (name == '# of Open Non-KMFs') {
                            openNonKMFtext = "<td class='name'><span style='background-color:" + bgColor + "'></span>" + name + ": </td><td class='value'>" + value + "</td>";
                        }
                        if (name == '# of Closures') {
                            closuretext = "<td class='name'><span style='background-color:" + bgColor + "'></span>" + name + ": </td><td class='value'>" + value + "</td>";
                        }
                    }

                  text = "<table class='" + $$.CLASS.tooltip + "'>";
                  text += "<thead><tr><th colspan='2'>" + title + "</th></tr></thead>";
                  text += "<tr>" + openKMFtext + "</tr>";
                  text += "<tr>" + openNonKMFtext + "</tr>";
                  text += "<tr>" + closuretext + "</tr>";
                  text += "</table>";
              
                  return text; // openKMFtext + openNonKMFtext + closuretext;
                }
            },
            data: {
                order: false,
                x: 'x',
                columns: [
                    dates,
                    numClosed,
                    numOpenNotKeyMission,
                    numOpenKeyMission,
                ],
                type: 'bar',
                groups: [
                    ['# of Closures', '# of Open Non-KMFs', '# of Open KMFs']
                ]
            },
            grid: {
                y: {
                    lines: lines
                }
            },
            axis: {
                x: {
                    label: {
                        text: 'Year',
                        position: 'outer-center'
                    },
                    type: 'timeseries',
                    tick: {
                        format: function(x) { return x.getFullYear(); }
                    },
                },
                y: {
                    label: {
                        text: '# of Data Centers',
                        position: 'outer-middle'
                    },
                    min: 0,
                    tick: {
                        format: d3.format('d')
                    },
                    padding: {top: 0, bottom: 0}
                }
            },
            onrendered: function () {
              var $$ = this, config = $$.config;
              var dataColors = config.data_colors;
              var wrapper = document.getElementById('c3-data-center-closure-progress-combined');
              var parent = wrapper.parentNode;

              /*
              * Add hidden data table for 508 compliance
              */
              var $$ = this, config = $$.config;
              var formatyear = 1;
              if (!parent.querySelector('.c3-data-table')) {
                parent.setAttribute('aria-label', 'A chart.');
                wrapper.setAttribute('aria-hidden', 'true');
                var table = '<table class="c3-data-table" aria-label="A tabular view of the data in the chart."><thead></th>';
                for (var row in config.data_columns) {
                    if (formatyear == 1) {
                        table += '<th>Year</th>';
                    } else {
                        table += '<th>' + config.data_columns[row][0] + '</th>';
                    }
                    formatyear = 0;
                }
                table += '</tr></thead><tbody>';
                for (var i = 1; i < config.data_columns[0].length; i++) {
                  var closed = config.data_columns[1][i];
                  var opennonkmf = config.data_columns[2][i];
                  var openkmf = config.data_columns[3][i];
                  table += '<tr><th>' + config.data_columns[0][i] + '</th><td>' + closed + '</td><td>' + opennonkmf + '</td><td>' + openkmf + '</td></tr>';
                }
                table += '</tbody></table>';
                if (agencyCode !== '000') {
                    table += '<p style="display: none;">DCOI Target Closures: '+targetClosures+'</p>';
                }
                wrapper.insertAdjacentHTML('afterend', table);
              }
            }
        });
    });
  }

    /*
      Cost Savings — Area Chart — Cumulative FDCCI and DCOI Cost Savings
    */
   if (document.getElementById('c3-cost-savings-fdcci-dcoi')) {
    $.getJSON(costSavingsOmbUrl, function(costSavingsOmbData) {
      $.getJSON(costSavingsTargetUrl, function(costSavingsTargetData) {
        $.getJSON(costSavingsMissDataUrl, function(costSavingsMissData) {
          /*
            Transform JSON into C3-friendly format
          */
          var d = costSavingsOmbData.result,
              t = costSavingsTargetData.result,
              munion = costSavingsMissData.result,
              mAgency = false,
              tYear = thisYear,
              y = d[0] ? d[0].fiscalYear : initYear,
              n = tYear - y,
              last = 0,
              lastOmb = 0,
              dTot = 0,
              mMax = 0,
              ombMax = 0,
              targ,
              target,
              goals = {},
              goal;
          var cols = [
            ['Fiscal Year'],
            ['FDCCI and DCOI Savings']
          ];
          var cats = [];
          if (agencyCode !== '000') {
            mAgency = d.length === 0 ? true : false;
          }
          for (var j = 0; j < t.length; j++) {
            if (t[j].agencyCode == agencyCode) {
              for (var k = 2; k >= 0; k--) {
                var yr = tYear - k;
                var nm = 'dcoiAgencyGoal' + yr;
                goals[yr] = t[j][nm];
              }
              targ = t[j].dcoiPolicyTarget ? t[j].dcoiPolicyTarget : null;
            }
          }
          for (var i = 0; i <= n; i++) {
            var fy = 'FY' + y,
                omb = (d[i] && d[i] !== null) ? d[i].amount : null;
            target = (i == n) ? targ : null;
            target = target ? target : null;
            goal = (goals[y]) ? (goals[y]) : null;
            cats.push(fy);
            cols[0].push(fy);
            var ombTop = dTot += omb;
            var thisOmb = (omb !== null) ? ombTop : null;
            lastOmb = (omb !== null) ? i : lastOmb;
            cols[1].push(thisOmb);
            ombMax = Math.max(ombMax, ombTop);
            last = i;
            mMax = Math.max(mMax, dTot);
            mMax = mMax * 1.1;
            y++;
          }

          /*
            Calculate magnitude/ceiling for chart
          */
          var valueTop = ombMax;
          var mag = (valueTop >= 1000) ? 'B' : 'M';
          var miniMag = (valueTop <= 100) ? true : false;
          var ceil = (mag == 'B') ? Math.ceil(mMax / 1000) * 1000 : miniMag ? Math.ceil(mMax / 10) * 10 : Math.ceil(mMax / 100) * 100;
          ceil = (ceil > 0) ? ceil : 10;
          var count = (valueTop > 0) ? 5 : 2;

          /*
            Initialize C3 chart
          */
          costSavingsDcoi = c3.generate({
            bindto: '#c3-cost-savings-fdcci-dcoi',
            size: {
              height: h.area
            },
            data: {
              type: 'area',
              x: 'Fiscal Year',
              columns: cols,
              colors: {
                'FDCCI and DCOI Savings': c.blue
              },
              groups: [
                ['FDCCI and DCOI Savings']
              ],
              labels: {
                format: function (v, id, i, j) {
                  var labelVal = '';
                  if (i == lastOmb && id == 'FDCCI and DCOI Savings' && v > 0) {
                    var vVal = v ? v : 0;
                    labelVal = (mag == 'B') ? '$' + (vVal / 1000).toFixed(1) + 'B' : '$' + vVal.toFixed(1) + 'M';
                  }
                  return labelVal;
                }
              },
              order: false
            },
            axis: {
              x: {
                type: 'category',
                categories: cats,
                tick: {
                  multiline: false,
                  rotate: -45
                }
              },
              y: {
                label: {
                  text: 'FDCCI and DCOI Savings ($)',
                  position: 'outer-middle'
                },
                max: ceil,
                padding: {
                  top: 0,
                  bottom: 0
                },
                tick: {
                  count: count,
                  format: function (d) {
                    var round = (mag == 'B') ? (d / 1000).toFixed(1) : d.toFixed(0);
                    var ret = (d > 0) ? '$' + round + mag : 0;
                    return ret;
                  }
                }
              }
            },
            grid: {
              y: {
                show: true
              }
            },
            point: {
              r: 5
            },
            padding: {
              top: 10,
              right: 20,
              bottom: 60,
              left: 90
            },
            tooltip: {
              format: {
                value: function (d) {
                  var round = (mag == 'B') ? d / 1000 : d;
                  return '$' + round.toFixed(1) + mag;
                }
              }
            },
            legend: {
              show: false
            },
            onrendered: function () {
              var $$ = this, config = $$.config;
              var dataColors = config.data_colors;
              var wrapper = document.getElementById('c3-cost-savings-fdcci-dcoi');
              var parent = wrapper.parentNode;

              /*
                Add warning if there is missing data
              */
              if (agencyCode === '000' && munion) {
                if (!parent.parentNode.querySelector('.usa-alert-warning')) {
                  warning = '<div class="usa-alert usa-alert-warning text-left">';
                  warning += '<div class="usa-alert-body"><h3 class="usa-alert-heading">Warning</h3>';
                  warning += '<div class="usa-alert-text"><p>There is incomplete, improperly formatted, or missing data for the following agencies: ' + munion.join(', ') + '</p></div></div>';
                  parent.insertAdjacentHTML('beforebegin', warning);
                }
              }
              if (agencyCode !== '000' && mAgency) {
                if (!parent.parentNode.querySelector('.usa-alert-warning')) {
                  warning = '<div class="usa-alert usa-alert-warning text-left">';
                  warning += '<div class="usa-alert-body"><h3 class="usa-alert-heading">Warning</h3>';
                  warning += '<div class="usa-alert-text"><p>This agency’s data cannot be displayed. It is either unavailable at the agency’s website or improperly formatted.</p></div></div>';
                  parent.insertAdjacentHTML('beforebegin', warning);
                }
              }

              /*
                Create custom legend as C3 legends tend to overlap in Firefox/IE/Edge
              */
              if (!parent.querySelector('.c3-legend-custom')) {
                var legend = document.createElement('ul');
                legend.classList.add('c3-legend-custom');
                legend.setAttribute('aria-hidden', 'true');
                var legendItems = '';
                var i = 1;
                Object.keys(dataColors).forEach(function(key) {
                  var arr = config.data_columns[i];
                  var nully = 0;
                  for (var j = 1; j < arr.length; j++) {
                    if (arr[j] !== null) {
                      nully++;
                    }
                  }
                  if (nully > 0) {
                    legendItems += '<li><span style="background-color: ' + dataColors[key] + '"></span>' + key + '</li>';
                  }
                  i++;
                });
                legend.innerHTML = legendItems;
                parent.appendChild(legend);
              }

              /*
                Add hidden data table for 508 compliance
              */
              var $$ = this, config = $$.config;
              if (!parent.querySelector('.c3-data-table')) {
                parent.setAttribute('aria-label', 'A chart.');
                wrapper.setAttribute('aria-hidden', 'true');
                var table = '<table class="c3-data-table" aria-label="A tabular view of the data in the chart."><thead></th>';
                for (var row in config.data_columns) {
                  table += '<th>' + config.data_columns[row][0] + '</th>';
                }
                table += '</tr></thead><tbody>';
                var rnd = function(val) {
                  var bil = val / 1000;
                  switch(true) {
                    case val == 0 || val == null:
                      return '—';
                    case val < 1000:
                      return '$' + val.toFixed(1) + 'M';
                    case val >= 1000:
                      return '$' + bil.toFixed(1) + 'B';
                  }
                }
                for (var i = 1; i < config.data_columns[0].length; i++) {
                  var dcoi = rnd(config.data_columns[1][i]);
                  table += '<tr><th>' + config.data_columns[0][i] + '</th><td>' + dcoi + '</td></tr>';
                }
                table += '</tbody></table>';
                wrapper.insertAdjacentHTML('afterend', table);
              }
            }
          });
        });
      });
    });
  }

  /*
      Cost Savings — Area Chart — Cumulative DCOI Cost Savings
    */
    if (document.getElementById('c3-cost-savings-dcoi')) {
      $.getJSON(costSavingsOmbUrl, function(costSavingsOmbData) {
        $.getJSON(costSavingsTargetUrl, function(costSavingsTargetData) {
          $.getJSON(costSavingsMissDataUrl, function(costSavingsMissData) {
            /*
              Transform JSON into C3-friendly format
            */
            var d = costSavingsOmbData.result,
                t = costSavingsTargetData.result,
                munion = costSavingsMissData.result,
                mAgency = false,
                tYear = thisYear,
                y = d[0] ? d[0].fiscalYear : initYear,
                n = tYear - y,
                last = 0,
                lastOmb = 0,
                dTot = 0,
                mMax = 0,
                ombMax = 0,
                agencyGoal = 0,
                targ,
                target,
                goals = {},
                goal,
                dcoiTotal,
                agGoal = '',
                lines = [],
                cats = [];
            var cols = [
              ['Fiscal Year'],
              ['DCOI Savings']
            ];
            if (agencyCode !== '000') {
              mAgency = d.length === 0 ? true : false;
            }
            for (var j = 0; j < t.length; j++) {
              if (t[j].agencyCode == agencyCode) {
                for (var k = 2; k >= 0; k--) {
                  var yr = tYear - k;
                  var nm = 'dcoiAgencyGoal' + yr;
                  goals[yr] = t[j][nm];
                }
                targ = t[j].dcoiPolicyTarget ? t[j].dcoiPolicyTarget : 0;
              }
            }
            for (var i = 0; i <= n; i++) {
              if (y >= initYearDcoi) {
                var fy = 'FY' + y,
                omb = (d[i] && d[i] !== null) ? d[i].amount : null;
                target = (i == n) ? targ : null;
                target = target ? target : null;
                goal = (goals[y]) ? (goals[y]) : null;
                cats.push(fy);
                cols[0].push(fy);
                var ombTop = dTot += omb;
                var thisOmb = (omb !== null) ? ombTop : null;
                lastOmb = (omb !== null) ? i : lastOmb;
                cols[1].push(thisOmb);
                agencyGoal += goal;
                ombMax = Math.max(ombMax, ombTop);
                last = i;
                mMax = Math.max(mMax, dTot, target);
                mMax = mMax * 1.1;
              }
              y++;
            }

            /*
              Calculate magnitude/ceiling for chart
            */
            var valueTop = Math.max(ombMax, target, agencyGoal);
            var mag = (valueTop >= 1000) ? 'B' : 'M';
            var miniMag = (valueTop <= 100) ? true : false;
            var ceil = (mag == 'B') ? Math.ceil(mMax / 1000) * 1000 : miniMag ? Math.ceil(mMax / 10) * 10 : Math.ceil(mMax / 100) * 100;
            ceil = (ceil > 0) ? ceil : 10;
            var count = (valueTop > 0) ? 5 : 2;

            var targetDcoi = (targ >= 1000) ? targ / 1000 : (targ > 0) ? targ : 0;
            var targMag = (targ >= 1000) ? 'B' : 'M';
            var targetDcoiFormatted = '$' + targetDcoi.toFixed(1) + targMag;
            var targetAgency = (agencyGoal >= 1000) ? agencyGoal / 1000 : (agencyGoal > 0) ? agencyGoal : 0;
            var targAgencyMag = (agencyGoal >= 1000) ? 'B' : 'M';
            var targetAgencyFormatted = '$' + agencyGoal.toFixed(1) + targMag;
            var targetBoth = '';

            var dcoiGoalClass = 'grid-dcoi';
            var agencyGoalClass = 'grid-agency';

            if (agencyCode !== '000') {
              agGoal = '<div><strong>DCOI Cost Savings Goal:</strong> ' + targetAgencyFormatted + '</div>';
            } else {
              targetBoth = 'OMB Target: ' + targetDcoiFormatted;
            }

            if (agencyCode === '000') {
                lines.push (
                {
                    value: targ,
                    class: dcoiGoalClass,
                    text: targetBoth
                }
                );
            }
            if (agencyCode !== '000') {
              lines.push (
                {
                  value: agencyGoal,
                  class: agencyGoalClass,
                  text: 'DCOI Cost Savings Goal: ' + targetAgencyFormatted
                }
              );
            }

            /*
              Initialize C3 chart
            */
            costSavingsDcoi = c3.generate({
              bindto: '#c3-cost-savings-dcoi',
              size: {
                height: h.area
              },
              data: {
                type: 'area',
                x: 'Fiscal Year',
                columns: cols,
                colors: {
                  'DCOI Savings': c.blue
                },
                groups: [
                  ['DCOI Savings']
                ],
                labels: {
                  format: function (v, id, i, j) {
                    var labelVal = '';
                    if (i == lastOmb && id == 'DCOI Savings' && v > 0) {
                      var vVal = v ? v : 0;
                      labelVal = (mag == 'B') ? '$' + (vVal / 1000).toFixed(1) + 'B' : '$' + vVal.toFixed(1) + 'M';
                    }
                    return labelVal;
                  }
                },
                order: false
              },
              axis: {
                x: {
                  type: 'category',
                  categories: cats,
                  tick: {
                    multiline: false,
                    rotate: -45
                  }
                },
                y: {
                  label: {
                    text: 'DCOI Savings ($)',
                    position: 'outer-middle'
                  },
                  max: ceil,
                  padding: {
                    top: 0,
                    bottom: 0
                  },
                  tick: {
                    count: count,
                    format: function (d) {
                      var round = (mag == 'B') ? (d / 1000).toFixed(1) : d.toFixed(0);
                      var ret = (d > 0) ? '$' + round + mag : 0;
                      return ret;
                    }
                  }
                }
              },
              grid: {
                y: {
                  show: true,
                  lines: lines
                }
              },
              point: {
                r: 5
              },
              padding: {
                top: 10,
                right: 20,
                bottom: 60,
                left: 90
              },
              tooltip: {
                format: {
                  value: function (d) {
                    var round = (mag == 'B') ? d / 1000 : d;
                    return '$' + round.toFixed(1) + mag;
                  }
                }
              },
              legend: {
                show: false
              },
              onrendered: function () {
                var $$ = this, config = $$.config;
                var dataColors = config.data_colors;
                var wrapper = document.getElementById('c3-cost-savings-dcoi');
                var parent = wrapper.parentNode;

                /*
                  Add warning if there is missing data
                */
                if (agencyCode === '000' && munion) {
                  if (!parent.parentNode.querySelector('.usa-alert-warning')) {
                    warning = '<div class="usa-alert usa-alert-warning text-left">';
                    warning += '<div class="usa-alert-body"><h3 class="usa-alert-heading">Warning</h3>';
                    warning += '<div class="usa-alert-text"><p>There is incomplete, improperly formatted, or missing data for the following agencies: ' + munion.join(', ') + '</p></div></div>';
                    parent.insertAdjacentHTML('beforebegin', warning);
                  }
                }
                if (agencyCode !== '000' && mAgency) {
                  if (!parent.parentNode.querySelector('.usa-alert-warning')) {
                    warning = '<div class="usa-alert usa-alert-warning text-left">';
                    warning += '<div class="usa-alert-body"><h3 class="usa-alert-heading">Warning</h3>';
                    warning += '<div class="usa-alert-text"><p>This agency’s data cannot be displayed. It is either unavailable at the agency’s website or improperly formatted.</p></div></div>';
                    parent.insertAdjacentHTML('beforebegin', warning);
                  }
                }

                /*
                  Create custom legend as C3 legends tend to overlap in Firefox/IE/Edge
                */
                if (!parent.querySelector('.c3-legend-custom')) {
                  var legend = document.createElement('ul');
                  legend.classList.add('c3-legend-custom');
                  legend.setAttribute('aria-hidden', 'true');
                  var legendItems = '';
                  var i = 1;
                  Object.keys(dataColors).forEach(function(key) {
                    var arr = config.data_columns[i];
                    var nully = 0;
                    for (var j = 1; j < arr.length; j++) {
                      if (arr[j] !== null) {
                        nully++;
                      }
                    }
                    if (nully > 0) {
                      legendItems += '<li><span style="background-color: ' + dataColors[key] + '"></span>' + key + '</li>';
                    }
                    i++;
                  });
                  legend.innerHTML = legendItems;
                  parent.appendChild(legend);
                }

                /*
                  Create inset legend for DCOI information
                */
                if (!parent.querySelector('.c3-legend-dcoi') && ombMax > 0) {
                  var legendDcoi = document.createElement('div');
                  legendDcoi.classList.add('c3-legend-dcoi');
                  legendDcoi.setAttribute('aria-hidden', 'true');
                  var legendDcoiItems = '';
                  if (agencyCode === '000') {
                    legendDcoiItems = '<div><strong>DCOI OMB Target Cost Savings:</strong> ' + targetDcoiFormatted + '</div>';
                  }
                  var actualDcoi = (mag == 'B') ? ombMax / 1000 : ombMax;
                  legendDcoiItems += agGoal;
                  legendDcoiItems += '<div><strong>DCOI Actual Cost Savings:</strong> ' + '$' + actualDcoi.toFixed(1) + mag + '</div>';
                  legendDcoi.innerHTML = legendDcoiItems;
                  parent.appendChild(legendDcoi);
                }

                /*
                  Add hidden data table for 508 compliance
                */
                var $$ = this, config = $$.config;
                if (!parent.querySelector('.c3-data-table')) {
                  parent.setAttribute('aria-label', 'A chart.');
                  wrapper.setAttribute('aria-hidden', 'true');
                  var table = '<table class="c3-data-table" aria-label="A tabular view of the data in the chart."><thead></th>';
                  for (var row in config.data_columns) {
                    table += '<th>' + config.data_columns[row][0] + '</th>';
                  }
                  table += '</tr></thead><tbody>';
                  var rnd = function(val) {
                    var bil = val / 1000;
                    switch(true) {
                      case val == 0 || val == null:
                        return '—';
                      case val < 1000:
                        return '$' + val.toFixed(1) + 'M';
                      case val >= 1000:
                        return '$' + bil.toFixed(1) + 'B';
                    }
                  }
                  for (var i = 1; i < config.data_columns[0].length; i++) {
                    var dcoi = rnd(config.data_columns[1][i]);
                    table += '<tr><th>' + config.data_columns[0][i] + '</th><td>' + dcoi + '</td></tr>';
                  }
                  table += '</tbody></table>';
                  wrapper.insertAdjacentHTML('beforebegin', table);
                }
              }
            });
          });
        });
      });
    }

    /*
      Cost Savings — Area Chart — PortfolioStat and Other Cost Savings
    */
    if (document.getElementById('c3-cost-savings-other')) {
      $.getJSON(costSavingsOtherUrl, function(costSavingsOtherData) {
        $.getJSON(costSavingsTargetUrl, function(costSavingsTargetData) {
          $.getJSON(costSavingsMissNonDataUrl, function(costSavingsMissNonData) {
            /*
              Transform JSON into C3-friendly format
            */
            var o = costSavingsOtherData.result,
                t = costSavingsTargetData.result,
                munion = costSavingsMissNonData.result,
                mAgency = false,
                tYear = thisYear,
                y = o[0] ? o[0].fiscalYear : initYear,
                n = tYear - y,
                last = 0,
                lastOther = 0,
                oTot = 0,
                mMax = 0,
                otherMax = 0,
                targ,
                target;
            var cols = [
              ['Fiscal Year'],
              ['PortfolioStat and Other Savings'],
              ['OMB Policy Target']
            ];
            var cats = [];
            if (agencyCode !== '000') {
              mAgency = o.length === 0 ? true : false;
            }
            for (var j = 0; j < t.length; j++) {
              if (t[j].agencyCode == agencyCode) {
                targ = t[j].otherPortfolioStatPolicyTarget ? t[j].otherPortfolioStatPolicyTarget : null;
              }
            }
            for (var i = 0; i <= n; i++) {
              var fy = 'FY' + y++,
                  other = (o[i] && o[i] !== null) ? o[i].amount : null;
              target = (i == n) ? targ : null;
              target = target ? target : null;
              cats.push(fy);
              cols[0].push(fy);
              var otherTop = oTot += other;
              var thisOther = (other !== null) ? otherTop : null;
              lastOther = (other !== null) ? i : lastOther;
              cols[1].push(thisOther);
              otherMax = Math.max(otherMax, otherTop);
              last = i;
              cols[2].push(target);
              mMax = Math.max(mMax, oTot, target);
              mMax = mMax * 1.1;
            }
            if (cols[2][n + 1] === null) {
              cols[2][n + 1] = 0;
            }

            /*
              Calculate magnitude/ceiling for chart
            */
            var valueTop = Math.max(otherMax, target);
            var mag = (valueTop >= 1000) ? 'B' : 'M';
            var miniMag = (valueTop <= 100) ? true : false;
            var ceil = (mag == 'B') ? Math.ceil(mMax / 1000) * 1000 : miniMag ? Math.ceil(mMax / 10) * 10 : Math.ceil(mMax / 100) * 100;
            ceil = (ceil > 0) ? ceil : 10;
            var count = (valueTop > 0) ? 5 : 2;

            /*
              Initialize C3 chart
            */
            costSavingsOther = c3.generate({
              bindto: '#c3-cost-savings-other',
              size: {
                height: h.area
              },
              data: {
                type: 'area',
                x: 'Fiscal Year',
                columns: cols,
                colors: {
                  'PortfolioStat and Other Savings': c.orange,
                  'OMB Policy Target': c.red
                },
                groups: [
                  ['PortfolioStat and Other Savings']
                ],
                labels: {
                  format: function (v, id, i, j) {
                    var labelVal = '';
                    if (i == lastOther && id == 'PortfolioStat and Other Savings' && v > 0) {
                      var vVal = v ? v : 0;
                      labelVal = (mag == 'B') ? '$' + (vVal / 1000).toFixed(1) + 'B' : '$' + vVal.toFixed(1) + 'M';
                    }
                    return labelVal;
                  }
                },
                order: false
              },
              axis: {
                x: {
                  type: 'category',
                  categories: cats,
                  tick: {
                    multiline: false,
                    rotate: -45
                  }
                },
                y: {
                  label: {
                    text: 'All Other PortfolioStat Savings ($)',
                    position: 'outer-middle'
                  },
                  max: ceil,
                  padding: {
                    top: 0,
                    bottom: 0
                  },
                  tick: {
                    count: count,
                    format: function (d) {
                      var round = (mag == 'B') ? (d / 1000).toFixed(1) : d.toFixed(0);
                      var ret = (d > 0) ? '$' + round + mag : 0;
                      return ret;
                    }
                  }
                }
              },
              grid: {
                y: {
                  show: true
                }
              },
              point: {
                r: 5
              },
              padding: {
                top: 10,
                right: 20,
                bottom: 60,
                left: 90
              },
              tooltip: {
                format: {
                  value: function (d) {
                    var round = (mag == 'B') ? d / 1000 : d;
                    return '$' + round.toFixed(1) + mag;
                  }
                }
              },
              legend: {
                show: false
              },
              onrendered: function () {
                var $$ = this, config = $$.config;
                var dataColors = config.data_colors;
                var wrapper = document.getElementById('c3-cost-savings-other');
                var parent = wrapper.parentNode;

                /*
                  Add warning if there is missing data
                */
                if (agencyCode === '000' && munion) {
                  if (!parent.parentNode.querySelector('.usa-alert-warning')) {
                    warning = '<div class="usa-alert usa-alert-warning text-left">';
                    warning += '<div class="usa-alert-body"><h3 class="usa-alert-heading">Warning</h3>';
                    warning += '<div class="usa-alert-text"><p>There is incomplete, improperly formatted, or missing data for the following agencies: ' + munion.join(', ') + '</p></div></div>';
                    parent.insertAdjacentHTML('beforebegin', warning);
                  }
                }
                if (agencyCode !== '000' && mAgency) {
                  if (!parent.parentNode.querySelector('.usa-alert-warning')) {
                    warning = '<div class="usa-alert usa-alert-warning text-left">';
                    warning += '<div class="usa-alert-body"><h3 class="usa-alert-heading">Warning</h3>';
                    warning += '<div class="usa-alert-text"><p>This agency’s data cannot be displayed. It is either unavailable at the agency’s website or improperly formatted.</p></div></div>';
                    parent.insertAdjacentHTML('beforebegin', warning);
                  }
                }

                /*
                  Create custom legend as C3 legends tend to overlap in Firefox/IE/Edge
                */
                if (!parent.querySelector('.c3-legend-custom')) {
                  var legend = document.createElement('ul');
                  legend.classList.add('c3-legend-custom');
                  legend.setAttribute('aria-hidden', 'true');
                  var legendItems = '';
                  var i = 1;
                  Object.keys(dataColors).forEach(function(key) {
                    var arr = config.data_columns[i];
                    var nully = 0;
                    for (var j = 1; j < arr.length; j++) {
                      if (arr[j] !== null) {
                        nully++;
                      }
                    }
                    if (nully > 0) {
                      legendItems += '<li><span style="background-color: ' + dataColors[key] + '"></span>' + key + '</li>';
                    }
                    i++;
                  });
                  legend.innerHTML = legendItems;
                  parent.appendChild(legend);
                }

                /*
                  Add hidden data table for 508 compliance
                */
                var $$ = this, config = $$.config;
                if (!parent.querySelector('.c3-data-table')) {
                  parent.setAttribute('aria-label', 'A chart.');
                  wrapper.setAttribute('aria-hidden', 'true');
                  var table = '<table class="c3-data-table" aria-label="A tabular view of the data in the chart."><thead></th>';
                  for (var row in config.data_columns) {
                    table += '<th>' + config.data_columns[row][0] + '</th>';
                  }
                  table += '</tr></thead><tbody>';
                  var rnd = function(val) {
                    var bil = val / 1000;
                    switch(true) {
                      case val == 0 || val == null:
                        return '—';
                      case val < 1000:
                        return '$' + val.toFixed(1) + 'M';
                      case val >= 1000:
                        return '$' + bil.toFixed(1) + 'B';
                    }
                  }
                  for (var i = 1; i < config.data_columns[0].length; i++) {
                    var other = rnd(config.data_columns[1][i]);
                    var target = rnd(config.data_columns[2][i]);
                    table += '<tr><th>' + config.data_columns[0][i] + '</th><td>' + other + '</td><td>' + target + '</td></tr>';
                  }
                  table += '</tbody></table>';
                  wrapper.insertAdjacentHTML('afterend', table);
                }
              }
            });
          });
        });
      });
    }

  });
});
