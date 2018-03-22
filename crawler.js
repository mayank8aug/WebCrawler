const request = require('request');
const cheerio = require('cheerio');
const fs = require("fs");
const jsonfile = require('jsonfile');

var initURL;
var maxCount;
const urlArr = [];
var visitedUrlCount = 0;
const visitedUrls = [];
var filePath;

readSystemProps();

//Read system properties to load the initial configs.
function readSystemProps() {
    var file = 'systemProperties.json';
    jsonfile.readFile(file, function(err, data) {
        if(data) {
            initURL = data['initialURL'];
            maxCount = data['maxPagesToVisit'];
            filePath = data['outputFilePath'];
            startProcess();
        } else {
            printLog("Error occurred while reading systemProperties.json file:\n" + err);
        }
    })
}

//Validate the configs and get started with crawling.
function startProcess() {
    if(!initURL || !maxCount || !filePath) {
        printLog("systemProperties.json file is not configured properly. Please make sure to provide all the configs.");
        return;
    }
    urlArr.push(initURL);
    cleanUpRecordFile();
    printLog("Started crawling web pages...");
    doCrawl();
}

//Delete the output file if already created to avoid appending the content to the same file again and again.
function cleanUpRecordFile() {
    fs.unlink(filePath, function (err) {
        //silent action to delete the record file if exists...
    });
}

//Decide whether to crawl or not based on the limits and available urls.
function doCrawl() {
    if(visitedUrlCount >= maxCount)  {
        printLog("Crawling completed successfully: Visited the max allowed pages.");
        printLog("Writing visited links to file...");
        printToFile(visitedUrls);
        printLog("Please find the crawled links listed in "+ filePath);
        return;
    } else if (urlArr.length < 1) {
        printLog("Crawling completed successfully: No more pages left to visit.");
        printLog("Writing visited links to file...");
        printToFile(visitedUrls);
        printLog("Please find the crawled links listed in "+ filePath);
        return;
    }
    var nextUrl = urlArr.pop();
    if(visitedUrls.indexOf(nextUrl) < 0) {
        visitAndParsePageSource(nextUrl, doCrawl);
    } else {
        doCrawl();
    }
}

//Visit the url and parse to fetch the links and give a callback to doCrawl().
function visitAndParsePageSource(url, callbackCrawl) {
    if(!url) {
        callbackCrawl();
        return;
    }
    visitedUrlCount++;
    visitedUrls.push(url);
    request(url, function(error, response, body) {
        if(error) {
            printLog("Error: " + error);
            callbackCrawl();
            return;
        }
        if(response.statusCode === 200) {
            var $ = cheerio.load(body);
            parsePageSourceAndFetchLinks($);
        }
        callbackCrawl();
    });
}

//Parse the page source to fetch all the hyperlinks
function parsePageSourceAndFetchLinks($) {
    var links = $('a');
    links.each(function() {
        var ref = $(this).attr('href');
        if(ref) {
            //Skipping relative URLS for now.
            if(ref.indexOf("//") === 0) {
                urlArr.push("http:" + ref);
            } else if(ref.indexOf("http") === 0 || ref.indexOf("https") === 0){
                urlArr.push(ref);
            }
        }
    });
}

//Printing the visited URLs to the file mentioned in the config json.
function printToFile(urlArr) {
    fs.appendFile(filePath, urlArr.join('\n'), function (err) {
        if (err) throw err;
    });
}

//Method to enable safe logging.
function printLog(msg) {
    console && console.log(msg);
}
