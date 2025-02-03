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

## Publications

If you use Promptly in academic research, please consider citing the following publications related to it.

Paul Denny, Juho Leinonen, James Prather, Andrew Luxton-Reilly, Thezyrie Amarouche, Brett A. Becker, and Brent N. Reeves. 2023. Promptly: Using Prompt Problems to Teach Learners How to Effectively Utilize AI Code Generators. https://arxiv.org/abs/2307.16364

Paul Denny, Juho Leinonen, James Prather, Andrew Luxton-Reilly, Thezyrie Amarouche, Brett A. Becker, and Brent N. Reeves. 2024. Prompt Problems: A New Programming Exercise for the Generative AI Era. In Proceedings of the 55th ACM Technical Symposium on Computer Science Education V. 1 (SIGCSE 2024). Association for Computing Machinery, New York, NY, USA, 296–302. https://doi.org/10.1145/3626252.3630909
