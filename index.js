const screenshot = require('screenshot-desktop')
const sharp = require('sharp')
const Tesseract = require('tesseract.js')
const getColors = require('get-image-colors')
const fetch = require('node-fetch');
const path = require('path')
const fs = require('fs');
const ks = require('node-key-sender');
const keys = require('./keys')
const filenamify = require('filenamify');

function scaleCoordinates(bounds) {
  for (key in bounds) {
    bounds[key] = Math.round(bounds[key]*windowScale)
  }
  return bounds
}

global.questionHasBeenSearched = false
global.windowScale = 1.25
global.color = {
  continue: [7, 206, 176],
  timer: [128, 60, 108]
}
global.continueKeyButton = 3

const questionBounds = scaleCoordinates({ left: 580, top: 150, width: 950-580, height: 245-150 })
const answerBounds = [
  scaleCoordinates({ left: 590, top: 286, width: 930-590, height: 314-286 }),
  scaleCoordinates({ left: 590, top: 342, width: 930-590, height: 314-286 }),
  scaleCoordinates({ left: 590, top: 396, width: 930-590, height: 314-286 })
]
const timerBounds = scaleCoordinates({ left: 592, top: 259, width: 1, height: 1 })
const continueBounds = scaleCoordinates({ left: 666, top: 730, width: 1, height: 1 })
/*
const questionBounds = scaleCoordinates({ left: 570, top: 200, width: 960-570, height: 350-200 })
const answerBounds = [
  scaleCoordinates({ left: 590, top: 420, width: 260, height: 40 }),
  scaleCoordinates({ left: 590, top: 510, width: 260, height: 40 }),
  scaleCoordinates({ left: 590, top: 600, width: 260, height: 40 })
]
const timerBounds = scaleCoordinates({ left: 590, top: 375, width: 1, height: 1 })
const continueBounds = scaleCoordinates({ left: 700, top: 695, width: 1, height: 1 })
*/

function main() {
  screenshot({format: 'png'})
  .then((img) => {

    var pipeline = sharp(img)

    pipeline.clone().extract(timerBounds)
    .toBuffer()
    .then(isQuestionActive)
    .then(function(isActive) {
      getQuestionIfFirstRead(isActive, pipeline)
    })
    //.toFile('images/timer.png').then()

    pipeline.clone().extract(continueBounds)
    .toBuffer()
    .then(isContinueActive).then(function(isActive) {
      if (isActive) {
        console.log(global.continueKeyButton)
        ks.sendKeys([global.continueKeyButton])
      }
      return Promise.resolve(null)
    })
    //.toFile('images/continue.png').then()*/

    /*.toBuffer()
    .then(isQuestionActive)
    .then((isActive) => questionActive(isActive, pipeline))
    */
  })
}

function test() {
  screenshot({format: 'png'})
  .then((img) => {

    var pipeline = sharp(img)
    
    pipeline.clone().extract(questionBounds)
    .greyscale()
    .toFile('images/question.png').then()

    pipeline.clone().extract(continueBounds)
    .toFile('images/continue.png').then()

    pipeline.clone().extract(timerBounds)
    .toFile('images/timer.png').then()

    answerBounds.map((bounds, idx) => {
      pipeline.clone().extract(bounds)
      .greyscale()
      .toFile(`images/answer_${idx}.png`).then()
    })
  })
}

function getQuestionIfFirstRead(isActive, p) {
  if (isActive && !questionHasBeenSearched) {
    /*setTimeout(() => {
      console.log('Time is up!')
      let answerIdx = randomChoice()
      console.log(answerIdx)
      ks.sendKeys([answerIdx])
    }, 8000);*/
    questionHasBeenSearched = true
    getQuestionAndAnswers(p)
    .then(function(QA) {
      findAnswer(QA).then(function(idx){
        console.log(QA.a[idx])
        ks.sendKeys([idx])
      })
    })
  } else if (!isActive) {
    questionHasBeenSearched = false
  }
}

function bufferToText(img) {
  let promise = new Promise((res, rej) => {
    Tesseract.recognize(img, {lang: 'swe'})
    .then((data) => {
      res(data.text.replace(/\n/g, " ").trim())
    })
  })
  return promise
}

async function getQuestionAndAnswers(p) {
  let promises = await Promise.all([getQuestion(p), getAnswers(p)])
  return {q: promises[0], a: promises[1]}
}

function getQuestion(p) {
  return p.clone().extract(questionBounds)
  .greyscale()
  .toBuffer().then(bufferToText)
}

function getAnswers(p) {
  return Promise.all(answerBounds.map(b => p.clone().extract(b)
  .greyscale()
  .toBuffer()
  .then(bufferToText)
  .then(function(answer){
    if (Number.isFinite(parseFloat(answer))) {
      answer = answer.replace(/\s/g, '')
    } else if (answer.substr(0,4) === 'Ett ') {
      answer = answer.substr(4)
    } else if (answer.substr(0,3) === 'En ') {
      answer = answer.substr(3)
    }
    return answer
  })))
}

function isQuestionActive(img) {
  return getColors(img, 'image/png')
  .then(function(colors) {
    return Promise.resolve(colors[0]._rgb.slice(0, 3));
  })
  .then((rgb) => isColorApprox(rgb, global.color.timer, 5));
}

function isContinueActive(img) {
  return getColors(img, 'image/png')
  .then(function(colors) {
    return Promise.resolve(colors[0]._rgb.slice(0, 3));
  })
  .then((rgb) => isColorApprox(rgb, global.color.continue, 5));
}

function isColorApprox(rgb, tar, err) {
  console.log(rgb, tar);
  return Promise.resolve((Math.abs(rgb[0]-tar[0]) < err) &&
  (Math.abs(rgb[1]-tar[1]) < err) &&
  (Math.abs(rgb[2]-tar[2]) < err))
}

function findAnswer(QA) {
  

  let query = encodeURIComponent(QA.q)
  let filename = filenamify(QA.q, {replacement: ''});

  console.log('---------------------')
  console.log(QA.q)

  let answers = QA.a
  
  /*let answersSplit = answers.map(ans => ans.split(' '))
  let firstWords = answersSplit.map(ans => ans[0])
  if (firstWords.every( (val, i, arr) => val === arr[0] )) {
    answers = answersSplit.map(ans => ans.slice(1).join(' '))
  }*/
  console.log('- '+answers.join('\n- '))
  let filePath = `json/${filename}.json`
  if (fs.existsSync(filePath)) {
    console.log('Reading from cache')
    var search = new Promise((resolve, reject) => resolve(JSON.parse(fs.readFileSync(filePath))));
  } else {
    /*let simpleSearchURL = `https://www.google.se/search?q=${query}`
    var search = fetch(simpleSearchURL)
    .then(r => r.text())
    .then(function(html) {
      console.log(html)
      var match = html.match(/Z0LcW">(.+?)<\/div>/)
      if (match) {
        match = match[1]
        console.log(match)
        return null
      } else {
      }
    })*/
    let url = `https://www.googleapis.com/customsearch/v1?gl=sv&hl=sv&cx=${keys.cx}&key=${keys.key}&q=${query}`
    console.log(url)
    var search = fetch(url).then(r => r.json()).then(function(json) {
      try {
        fs.writeFileSync(filePath, JSON.stringify(json))
      } catch (err) {
        console.error(err)
      }
      return json
    })
    
  }

  return search
  .then(function(data) {
    if (data.hasOwnProperty('items')) {
      return Promise.all(data.items.map(i=>i.snippet))
      /*
      return Promise.all(data.items.map(i=>i.link).filter(i=>!i.includes('.pdf')))
      .then(links => Promise.all(links.map(link => fetch(link).catch(err => null))))
      .then(sites => Promise.all(sites.map(function(s) {
        return s ? s.text() : ''
      })))
      */
      .then(text => answers.map(ans => text.map(function(t) {
        //let regex = '( '+ans.split(' ').join(' )|( ')+' )'
        let found = t.match(new RegExp(ans, "gi"))
        let count = found ? found.length : 0
        return count
      })))
      .then(counts => counts.map(ans => ans.reduce((a,b) => a + b, 0)))
      
    } else {
      return [0,0,0]
    }
  })
  .then(function(total) {
    console.log(total)
    if (JSON.stringify(total)===JSON.stringify([0, 0, 0])) {
      return randomChoice();
    }
    return total.indexOf(Math.max(...total))
  })
}

function randomChoice() {
  return Math.floor(Math.random()*(3))
}

const fetch_retry = async (url, options, n) => {
  try {
      return await fetch(url, options)
  } catch(err) {
      if (n === 1) throw err;
      return await fetch_retry(url, options, n - 1);
  }
};

if (process.argv[2]) {
  test()
} else {
  var mainLoop = setInterval(() => {
    main()
  }, 1000);
}