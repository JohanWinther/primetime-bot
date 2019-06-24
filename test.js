const fetch = require('node-fetch');
const path = require('path')
const fs = require('fs');
const ks = require('node-key-sender');
const keys = require('./keys')


let query = 'Hur många grader ör en cirkel?';
let answers = ['360 grader', '180 grader', '270 grader']
//let url = `https://www.googleapis.com/customsearch/v1?cx=${keys.cx}&key=${keys.key}&q=${query}`
//let url = 'file:///'+path.resolve(__dirname, 'searchData.json')

let promise1 = new Promise((resolve, reject) => resolve(JSON.parse(fs.readFileSync('searchData.json'))));
promise1
//fetch(url).then(r => r.json())
.then(data => data.items
        .map(i=>i.link)
        .filter(i=>!i.includes('.pdf')))
.then(links => Promise.all(links.map(link => fetch(link))))
.then(sites => Promise.all(sites.map(s => s.text())))
//.then(html => Promise.all(html.map(data => extractor(data, 'sv').text)))
.then(text => answers.map(ans => text.map(function(t) {
    let found = t.match(new RegExp(ans,"g"))
    return found ? found.length : 0
})))
.then(counts => counts.map(ans => ans.reduce((a,b) => a + b, 0)))
.then(total => total.indexOf(Math.max(...total)))
.then(idx => ks.sendKeys([idx]));