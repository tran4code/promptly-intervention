# Promptly

Welcome to Promptly. This is my first open source project. Thank you for using Promptly~!

## Infrastructure needed:
   1. Google Firebase project with: 
        * Hosting ($)
    This project hosts the frontend website to be publicly available. The Firebase keys for hosting needs to be added to the .env file at the root directory. 
        * Functions ($$)
    The backend code which communicates with ChatGPT or your LLM of choice, stores your questions/answers/scripts and connects to the jobe instance.
    Your credentials.json that you will receive after setting up firebase functions needs to be put inside the /functions folder. 
        * Firestore Database
    Stores all the responses and interactions that goes through the backend. 
    2. CHATGPT API subscription
    Your api key and organization key needs to go under the /functions/.env
    3. [Jobe](https://github.com/trampgeek/jobe) or [Jobeinabox](https://github.com/trampgeek/jobeinabox)
    The link to your jobe or jobe in a box needs to go under the /functions/.env

## How does functions/index.js work?!?!

First, take a look at example_solution_script.py. A script is build with the chatgpt code and then sent to the jobeinabox. Then we parse the response from jobeinabox to then return the values to the frontend. 


## Dev commands 

Hosting
`npm install`

`npm run build`

`firebase serve --only hosting`


Functions
`npm install`

`firebase emulators:start --only functions`