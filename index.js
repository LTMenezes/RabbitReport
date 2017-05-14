var blessed = require('blessed');
var contrib = require('blessed-contrib');
var config = require('./input.json');
var request = require('request');

var screen = blessed.screen();

var numberOfCols = config.queuesToMonitor.length / 2 + 1;

var grid = new contrib.grid({ rows: 2, cols: numberOfCols, screen: screen });

var markdown = grid.set(0, 0, 1, 1, contrib.markdown);

markdown.setMarkdown(
    '# Rabbit Reports \n RabbitMQ reports without leaving your terminal \n'
    + '# Configuration \n'
    + 'Address: ' + config.rabbitAddress + '\n'
    + 'User: ' + config.rabbitUser + '\n'
    + 'Monitoring ' + config.queuesToMonitor.length + ' rabbit queues\n'); 

var queuesMonitors = [];

for (i = 0; i < config.queuesToMonitor.length; i++) {
    var column = (i + 1) / 2;
    var row = (i + 1) % 2;

    queuesMonitors.push(
        grid.set(row, column, 1, 1, contrib.stackedBar,
        {
            label: config.queuesToMonitor[i].split('/')[1]
            , barWidth: 7
            , barSpacing: 4
            , xOffset: 0
            , height: "40%"
            , width: "50%"
            , barBgColor: ['green', 'red']
        })
    );
};

function updateMonitorData()
{
    for (i = 0; i < queuesMonitors.length; i++) {
        var queueDetailUrl = config.rabbitAddress + '/api/queues/' + config.queuesToMonitor[i];
        var options = {
            url: queueDetailUrl,
            auth: {
                'user': config.rabbitUser,
                'pass': config.rabbitPass
            }
        };

        function callback(error, response, body) {
            if (!error && response.statusCode == 200) {
                var info = JSON.parse(body);
                var index = config.queuesToMonitor.findIndex((name) => { return name.split('/')[1] == info.name });
                queuesMonitors[index].setData(
                    {
                        barCategory: ['Q1', 'Q2', 'Q3', 'Q4']
                        , stackedCategory: ['Ready', 'Unacked']
                        , data:
                        [
                            [info.messages_ready, 0]
                            , [0, info.messages_unacknowledged]
                        ]
                    });
            }

            screen.render()
        }

        request(options, callback);
    };

    setTimeout(updateMonitorData, 5000);
}

screen.key(['escape', 'q', 'C-c'], function (ch, key) {
    return process.exit(0);
});

screen.render();

updateMonitorData();