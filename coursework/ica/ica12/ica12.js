let newBtn = document.querySelector('#js-new-quote');
newBtn.addEventListener('click', getQuote); 

let answerBTN = document.querySelector('#js-tweet');
addEventListener ('click', showAnswer);

const answerText = document.querySelector('#js-answer-text')

let current = {
    qustion: "",
    answer: ""
}

const endpoint = 'https://trivia.cyberwisp.com/getrandomchristmasquestion';

async function getQuote() {
   // alert("THIS WORKS!"); 
   try {
    const response = await fetch(endpoint);
    if (!response.ok) {
        throw Error(response.statusText);
    }
    const json = await response.json();
    console.log(json);
    displayQuote(json['question']);
    current.question = json['question'];
    current.answer = json["answer"];
    console.log(current.answer);
   } catch (err) {
    console.log(err)
    alert('Failed to fetch new quote')
   }
}

function displayQuote(quote) {
    const quoteText = document.querySelector
    ('#js-quote-text');
    quoteText.textContent = quote; 
    answerText.textContent = ""
}

function showAnswer() {
    const answerText = document.querySelector('#js-answer-text')
    answerText.textContent = current.answer;
}

getQuote();