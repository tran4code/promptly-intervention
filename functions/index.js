/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });



// The Cloud Functions for Firebase SDK to create Cloud Functions and triggers.
const { logger } = require("firebase-functions");
require("firebase-functions/logger/compat");
const { onRequest } = require("firebase-functions/v2/https");
// The Firebase Admin SDK to access Firestore.
const { initializeApp } = require("firebase-admin/app");
const { getRemoteConfig } = require("firebase-admin/remote-config");
const { getFirestore } = require("firebase-admin/firestore");
const admin = require('firebase-admin');
const { OpenAI } = require("openai");
const axios = require('axios');
const cors = require('cors')({ origin: true });
const functions = require('firebase-functions');
require('dotenv').config();
const serviceAccount = require('./credentials.json') //CREATE YOUR 

const {
    log,
    info,
    debug,
    warn,
    error,
    write,
} = require("firebase-functions/logger");

initializeApp();

const openai = new OpenAI({
    organization: process.env.chatgpt_organization,
    apiKey: process.env.chatgpt_apiKey,
});

const storeSuccess = async (userEmail, prompt, classId, questionId, attemptId, promptLanguage) => {
    let timestamp = new Date();
    let wordCount = prompt.split(' ').length;

    let testCaseCount = 1;
    let passedTestCaseCount = 0;
    for (let i = 0; i < 3; i++) {
        [testCases, stringifiedTestFunction, language, testType] = testCaseGenerator(classId, questionId);
        testCaseCount += testCases.length;
        chatGPTResult = await askOpenai(prompt, language, testType);

        if (chatGPTResult) {
            const resp = await testCode(chatGPTResult, language, testCases, stringifiedTestFunction, testType);
            if (resp) {
                testResult = resp.testResult;
                passedTestCaseCount += (testResult.match(/1/g) || []).length
            }
        }
    }

    let robustnessScore = (passedTestCaseCount / testCaseCount) * 100;
    let successRecord = {
        userEmail: userEmail,
        questionId: questionId,
        classId: classId,
        attemptId: attemptId,
        prompt: prompt,
        promptLanguage: promptLanguage,
        wordCount: wordCount,
        robustnessScore: robustnessScore,
        created: timestamp.toISOString()
    };

    log('successRecord', successRecord);
    let docRef = await getFirestore()
        .collection('question_success_tracker')
        .add(successRecord);

    let topRobustness = robustnessScore;
    const topRobustnessQuery = await getFirestore()
        .collection('question_success_tracker')
        .where('classId', '==', classId)
        .where('questionId', '==', questionId)
        .orderBy('robustnessScore', 'desc')
        .limit(1)
        .get();

    let topWordCount = wordCount;
    const topWordCountQuery = await getFirestore()
        .collection('question_success_tracker')
        .where('classId', '==', classId)
        .where('questionId', '==', questionId)
        .orderBy('wordCount', 'asc')
        .limit(1)
        .get();

    topRobustness = topRobustnessQuery.docs[0].data().robustnessScore;
    topWordCount = topWordCountQuery.docs[0].data().wordCount;

    return { "robustnessScore": successRecord.robustnessScore, "topRobustness": topRobustness, "wordCount": successRecord.wordCount, "topWordCount": topWordCount };

}

const askOpenai = async (prompt, language, testType) => {
    try {
        let message = prompt;
        if (language == 'python') {
            if (testType == "function") {
                message += ". The code should be python. The output should only contain code. There should be no comments or other explanatory texts. The output should begin with 'def' to signify the beginning of a function definition. Do not include triple-quote comment in your response.";
            } else if (testType == 'scripting') {
                message += ". The output should only consist of Python code. The output should not contain any comments or any explanatory text. Show the Python code only. Do not include triple-quote comment in your response.";
            }
        } else if (language == 'c') {
            message += ". The code should be in C. The output should only contain code. There should be no comments or other explanatory texts. Do not include triple-quote comment in your response.";
        } else if (language == 'java') {
            message += "Only return the function, not the class. Do not add imports. The code should be in Java. The output should only contain code. There should be no comments or other explanatory texts. Do not include triple-quote comment in your response.";
        }
        const completion = await openai.chat.completions.create({
            messages: [{ role: 'user', content: message }],
            model: 'gpt-3.5-turbo-16k',
        });
        chatGPTResult = completion.choices[0].message?.content;
        log(chatGPTResult);
        if (chatGPTResult.includes('```')) {
            log('manipulate to remove ``` for ', chatGPTResult, ' with prompt ', prompt);
            const startIndex = chatGPTResult.indexOf('```');
            const endIndex = chatGPTResult.lastIndexOf('```');
            chatGPTResult = chatGPTResult.substring(startIndex + 3, endIndex);
        }
        if (chatGPTResult[0] == 'c') {
            log('manipulate to remove c for ', chatGPTResult, ' with prompt ', prompt);
            chatGPTResult = chatGPTResult.substring(1,);
        }
        if (chatGPTResult.startsWith('java')) {
            log('manipulate to remove c for ', chatGPTResult, ' with prompt ', prompt);
            chatGPTResult = chatGPTResult.substring(4,);
        }
        return chatGPTResult
    } catch (error) {
        if (error.response) {
            console.log('chatgpt  errored! response status: ', error.response.status);
            console.log('chatgpt  errored! response data: ', error.response.data);
        } else {
            console.log('chatgpt  errored! no response - message: ', error.message);
        }
        return;
    }
};

const testCode = async (code, language, testCases, stringifiedTestFunction, testType) => {
    let jobelink = process.env.jobeinabox_link;
    /*
        * Example output from jobe
        * {
            "run_id": null,
            "outcome": 15,
            "cmpinfo": "",
            "stdout": "Test failed for input [[1, 2], [3, 4]]",
            "stderr": "Traceback (most recent call last):\\n  File \\\"/home/jobe/runs/jobe_iTpOg1/test.c\\\", line 15, in <module>\\n    result = swap(array)\\nTypeError: swap() missing 1 required positional argument: 'b'\\n\"
        }
        */
    try {
        let stdout = '';
        let stderr = '';
        let testResult = '';
        for (let i = 0; i < testCases.length; i++) {
            testCase = testCases[i];
            if (language == "c") {
                sourceCode = "\n#include <stdio.h>\n#include <stdbool.h>\n#include <stdio.h>\n" + code + stringifiedTestFunction + testCase
            } else if (language == 'java') {
                sourceCode = "import java.util.Arrays; class Test {" + stringifiedTestFunction + code + "public static void main(String[] args) {" + testCase + " }}";
                sourceCode.replace(/(\r\n|\n|\r)/gm, "");
            } else if (testType == "function") {
                sourceCode = stringifiedTestFunction + code + testCase
            } else {
                sourceCode = code
            }

            let runSpec = {
                "sourcecode": sourceCode
            };

            if (language == "python") {
                runSpec.language_id = "python3";
                runSpec.sourcefilename = "test.py";
            } else if (language == 'c') {
                runSpec.language_id = "c";
                runSpec.sourcefilename = "test.c";
            } else if (language == 'java') {
                runSpec.language_id = "java";
                runSpec.sourcefilename = "Test.java";
            }

            if (testType == 'scripting') {
                runSpec['input'] = testCase.input;
            }

            await axios.post(jobelink, { "run_spec": runSpec }).then((res) => {

                jobeStdout = res.data.stdout;
                jobeError = res.data.stderr + res.data.cmpinfo;
                stdout += jobeStdout
                if (jobeError) {
                    stderr = jobeError;

                } else if (stderr == '' && jobeStdout.includes('Test failed')) {
                    stderr = jobeStdout.toString();

                }
                if (testType == 'function') {

                    if (stderr != '') {
                        testResult += '0'
                    } else {
                        testResult += '1'
                    }
                } else {
                    if (!jobeStdout.includes(testCase.expected)) {
                        let fail = "Test failed for input " + testCase.input + "\nExpected result was " + testCase.expected + "\nBut actual result was " + jobeStdout.toString();
                        if (stderr == '') {
                            stderr = fail;
                        }
                        stdout += fail;
                        testResult += '0';
                    } else {
                        testResult += '1';
                        stdout += "Test passed for " + testCase.expected;
                    }
                }
            })
        }
        return { "stdout": stdout, "stderr": stderr, "testResult": testResult }
    } catch (error) {
        if (error.response) {
            log('jobe  errored! response status: ', error.response.status);
            log('jobe  errored! response data: ', error.response.data);
        } else {
            log('jobe  errored! no response - message: ', error.message);
        }
        return;
    }
};

const testCaseGenerator = (classId, questionId) => {
    let stringifiedTestFunction = '';
    let testCases = [];
    let language = 'python';
    let testType = 'function'
    if (classId == 'Intro Python Scripting') {
        testType = "scripting"
        if (questionId == 1) {//input name
            testCases = [
                { 'input': "Rob", 'expected': 'Hello Rob' },
                { 'input': "Apple", 'expected': 'Hello Apple' },
                { 'input': "I love CS", 'expected': 'Hello I love CS' },
                { 'input': "Bob", 'expected': 'Hello Bob' }
            ]
        } else if (questionId == 2) {//age
            testCases = [
                { 'input': "4", 'expected': 'Child' },
                { 'input': "23", 'expected': 'Adult' },
                { 'input': "18", 'expected': 'Teenager' },
                { 'input': "9", 'expected': 'Tween' }
            ]

        } else if (questionId == 3) { //judge
            testCases = [
                { 'input': "8.0 9.5 7.5 6.0 9.0", 'expected': '8.17' },
                { 'input': "10.0 9.5 7.5 8.0 6.5", 'expected': '8.33' },
                { 'input': "9.0 4.5 6.8 7.0 3.0", 'expected': '6.1' },
                { 'input': "8.0 6.0 6.0 4.0 6.0", 'expected': '6' }
            ]

        }
    } else if (classId == 'PA2 (Programação e Algoritmos 2 - Programming and Algorithms 2)'
        || classId == 'Intro Python Functions Part 1'
        || classId == 'COMPSCI 747'
        || classId == 'COMPSCI 101 Lab 10') {//'COMPSCI130 - Lab 10') {
        stringifiedTestFunction = '\ndef testFunc(input_given, expected, result):\n   if result == expected:\n       print("Test passed for input", input_given)\n       print()\n   else:\n       print("Test failed for input", input_given)\n       print("Expected result was", expected)\n       print("But actual result was", result)\n       print()\n';

        if (questionId == 1) { //number of 0s
            testCases = ["\ntest_input = [0]\nexpected = 1\nresult = counter(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = [10, 20, 30]\nexpected = 0\nresult = counter(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = [1, 0, 2, 0, 3]\nexpected = 2\nresult = counter(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = [0, 10, 10, 0, 0, 0]\nexpected = 4\nresult = counter(test_input)\ntestFunc(test_input, expected, result)\n"
            ];
        } else if (questionId == 2) { //initials
            testCases = ["\ntest_input = 'a b c d e'\nexpected = 'ABCDE'\nresult = initials(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'xxx yyy zzz'\nexpected = 'XYZ'\nresult = initials(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'dog cat fish bird'\nexpected = 'DCFB'\nresult = initials(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'Cherries'\nexpected = 'C'\nresult = initials(test_input)\ntestFunc(test_input, expected, result)\n"
            ];

        } else if (questionId == 3) { //repeat
            testCases = ["\ntest_input = [1, 1, 1]\nexpected = [1, 1, 1]\nresult = repeat(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = [5, 1, 3, 2]\nexpected = [5, 5, 5, 5, 5, 1, 3, 3, 3, 2, 2]\nresult = repeat(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = [3, 3, 4]\nexpected = [3, 3, 3, 3, 3, 3, 4, 4, 4, 4]\nresult = repeat(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = [7]\nexpected = [7, 7, 7, 7, 7, 7, 7]\nresult = repeat(test_input)\ntestFunc(test_input, expected, result)\n"
            ];
        }

    } else if (classId == 'Prettest: Pilot Class - Intro to Coding') {
        stringifiedTestFunction = '\ndef testFunc(input_given, expected, result):\n   if result == expected:\n       print("Test passed for input", input_given)\n       print()\n   else:\n       print("Test failed for input", input_given)\n       print("Expected result was", expected)\n       print("But actual result was", result)\n       print()\n';

        if (questionId == 1) { 
            testCases = ["\ntest_input = 'hello world'\nexpected = 'hll wrld'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'AEIOUaeiou'\nexpected = ''\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'Python Programming'\nexpected = 'Pythn Prgrmmng'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = '12345'\nexpected = '12345'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'Why so serious?'\nexpected = 'Why s srs?'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n"
            ];
        } else if (questionId == 2) { 
            testCases = ["\ntest_input = [1, -2, 3, 0, -5, 6]\nexpected = [1, 3, 6]\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = [-10, -20, 0, -5]\nexpected = []\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = [0, 7, 15, -3]\nexpected = [7, 15]\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = [42]\nexpected = [42]\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = []\nexpected = []\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n"
            ];

        } else if (questionId == 3) {
            testCases = ["\ntest_input = 'abacaba'\nexpected = 'Awesome'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'baba'\nexpected = 'Awesome'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'aaaabbbb'\nexpected = 'Awesome'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'bbbbbb'\nexpected ='Brilliant'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'aabb'\nexpected ='Awesome'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n"
            ];
        } else if (questionId == 4) { 
            testCases = ["\ntest_input = '123456'\nexpected = 'Even Wins'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = '24680'\nexpected = 'Even Wins'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = '13579'\nexpected = 'Odd Wins'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = '112233'\nexpected = 'Odd Wins'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = '222111'\nexpected = 'Even Wins'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n"
            ];
        } else if (questionId == 5) { 
            testCases = ["\ntest_input = ['Hello', 'World', 'Python', 'Code']\nexpected = ['world', 'python']\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = ['Elephant', 'Apple', 'Tree', 'Sky']\nexpected = ['sky']\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = ['Eel', 'Bee', 'Ant', 'Dog']\nexpected = ['ant', 'dog']\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = ['EVERYTHING', 'nothing', 'EVER', 'NONE']\nexpected = ['nothing']\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = ['fun', 'sun', 'run', 'game']\nexpected = ['fun', 'sun', 'run']\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n"
            ];
        } else if (questionId == 6) { 
            testCases = ["\ntest_input = ['hello', 'world', 'STOP', 'python']\nexpected = 5.0\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = ['apple', 'banana', 'cherry', 'STOP', 'date']\nexpected = 5.7\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = ['STOP', 'early', 'exit']\nexpected = 0.0\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = ['one', 'two', 'three', 'four']\nexpected = 3.8\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = ['a', 'STOP', 'longer', 'list']\nexpected = 1.0\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n"
            ];
        } 

    } else if (classId == 'Posttest: Pilot Class - Intro to Coding') {
        stringifiedTestFunction = '\ndef testFunc(input_given, expected, result):\n   if result == expected:\n       print("Test passed for input", input_given)\n       print()\n   else:\n       print("Test failed for input", input_given)\n       print("Expected result was", expected)\n       print("But actual result was", result)\n       print()\n';

        if (questionId == 1) { 
            testCases = ["\ntest_input = 'hello'\nexpected = 'olleh'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'Python'\nexpected = 'nohtyP'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'a b c'\nexpected = 'c b a'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = '12345'\nexpected = '54321'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = ''\nexpected = ''\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n"
            ];
        } else if (questionId == 2) { 
            testCases = ["\ntest_input = [15, 3, -5, 10, 7, 12, -1]\nexpected = [3, 10, 7]\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = [-2, 0, 5, 11, 10]\nexpected = [0, 5, 10]\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = [20, 30, -10, -20]\nexpected = []\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = [8, 9, 10, 11]\nexpected = [8, 9, 10]\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = []\nexpected = []\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n"
            ];

        } else if (questionId == 3) {
            testCases = ["\ntest_input = '55335'\nexpected = 'High Five'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = '33355'\nexpected = 'Lucky Three'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = '535353'\nexpected = 'Neutral'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = '555'\nexpected ='High Five'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = '333'\nexpected ='Lucky Three'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n"
            ];
        } else if (questionId == 4) { 
            testCases = ["\ntest_input = 3, 4\nexpected = 'A'\nresult = mystery_func(*test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = -5, 7\nexpected = 'B'\nresult = mystery_func(*test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = -6, -2\nexpected = 'C'\nresult = mystery_func(*test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 4, -8\nexpected = 'D'\nresult = mystery_func(*test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 0, 3\nexpected = 'Z'\nresult = mystery_func(*test_input)\ntestFunc(test_input, expected, result)\n"
            ];
        } else if (questionId == 5) { 
            testCases = ["\ntest_input = ['banana', 'apple', 'cherry', 'orange', 'blueberry']\nexpected = ['BANANA', 'CHERRY', 'BLUEBERRY']\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input =['dog', 'cat', 'bird', 'bat', 'elephant']\nexpected = ['CAT', 'BIRD', 'BAT']\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = ['hello', 'ball', 'cup', 'dog', 'batman']\nexpected = ['BALL', 'CUP', 'BATMAN']\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = ['car', 'apple', 'banana', 'circle', 'dog']\nexpected = ['CAR', 'BANANA', 'CIRCLE']\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = ['go', 'boat', 'climate', 'cheese']\nexpected = ['BOAT', 'CLIMATE', 'CHEESE']\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n"
            ];
        } else if (questionId == 6) { 
            testCases = ["\ntest_input = [23, 45, 67, 99999, 34, 56]\nexpected = 45.0\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = [12, 34, 56, 78, 99999, 90, 100]\nexpected = 45.0\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = [99999, 10, 20, 30]\nexpected = 0.0\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = [8, 15, 25, 99999]\nexpected = 16.0\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = [40, 50, 60, 99999]\nexpected = 50.0\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n"
            ];
        } 

    } else if (classId == 'Practice Problems: Pilot Class - Intro to Coding') {
        stringifiedTestFunction = '\ndef testFunc(input_given, expected, result):\n   if result == expected:\n       print("Test passed for input", input_given)\n       print()\n   else:\n       print("Test failed for input", input_given)\n       print("Expected result was", expected)\n       print("But actual result was", result)\n       print()\n';

        if (questionId == 5) { 
            testCases = ["\ntest_input = 'world'\nexpected = 'yqtnf'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'abcdef'\nexpected = 'cdefgh'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'zebra'\nexpected = 'bgdtc'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'apple123'\nexpected = 'crrng123'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'a quick brown fox!'\nexpected = 'c swkem dtqyp hqz!'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n"
            ];
        } else if (questionId == 1) { 
            testCases = ["\ntest_input = 'AAABBB'\nexpected = 'Draw'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'AAAAA'\nexpected = 'Team A Wins'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'BBBB'\nexpected = 'Team B Wins'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'BBBBBAAA'\nexpected = 'Team B Wins'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'BAAABBBBA'\nexpected = 'Team B Wins'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n"
            ];
        } else if (questionId == 2) {
            testCases = ["\ntest_input = -10\nexpected = 'Cold'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 0\nexpected = 'Warm'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 15\nexpected = 'Warm'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 26\nexpected = 'Hot'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 50\nexpected = 'Hot'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n"
            ];
        } else if (questionId == 3) { 
            testCases = ["\ntest_input = [1, 2, 3, 4]\nexpected = 10\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = [5, 10, 15]\nexpected = 30\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = []\nexpected = 'Invalid'\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = [150]\nexpected = 150\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = [-1, -2, -3, -4]\nexpected = -10\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n"
            ];
        } else if (questionId == 4) { 
            testCases = ["\ntest_input = ['cat', 'elephant', 'dog', 'fish']\nexpected = ['elephant', 'fish']\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = ['a', 'apple', 'ban', 'kiwi']\nexpected = ['apple', 'kiwi']\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = ['it', 'is', 'amazing', 'sky']\nexpected = ['amazing']\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = ['hello', 'world', 'ok']\nexpected = ['hello', 'world']\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = ['sun', 'fun', 'rain']\nexpected = ['rain']\nresult = mystery_func(test_input)\ntestFunc(test_input, expected, result)\n"
            ];
        } 

    } else if (classId == 'lost') {

        stringifiedTestFunction = '\ndef testFunc(input_given, expected, result):\n   if result == expected:\n       print("Test passed for input", input_given)\n       print()\n   else:\n       print("Test failed for input", input_given)\n       print("Expected result was", expected)\n       print("But actual result was", result)\n       print()\n';

        if (questionId == 7) { //keys in range
            testCases = [`\nmy_dict = {'John Doe': 25, 'Jane Smith': 30, 'Alice Johnson': 40, 'Bob Brown': 35, 'Sarah Müller': 28}\nstart_range = 30\nend_range = 40\nexpected = ['Jane Smith', 'Alice Johnson', 'Bob Brown']\ntest_input = (my_dict, start_range, end_range)\nresult=keys_in_range(my_dict, start_range, end_range)\ntestFunc(test_input, expected, result)\n`,
                `\nmy_dict = {'John Doe': 25, 'Jane Smith': 30, 'Alice Johnson': 40, 'Bob Brown': 35, 'Sarah Müller': 28}\nstart_range = 35\nend_range = 35\nexpected = ['Bob Brown']\ntest_input = (my_dict, start_range, end_range)\nresult=keys_in_range(my_dict, start_range, end_range)\ntestFunc(test_input, expected, result)\n`,
                `\nmy_dict = {'John Doe': 25, 'Jane Smith': 30, 'Alice Johnson': 40, 'Bob Brown': 35, 'Sarah Müller': 28}\nstart_range = 50\nend_range = 60\nexpected = []\ntest_input = (my_dict, start_range, end_range)\nresult=keys_in_range(my_dict, start_range, end_range)\ntestFunc(test_input, expected, result)\n`,
                `\nmy_dict = {'John Doe': 25, 'Jane Smith': 30, 'Alice Johnson': 40, 'Bob Brown': 35, 'Sarah Müller': 28}\nstart_range = 40\nend_range = 30\nexpected = []\ntest_input = (my_dict, start_range, end_range)\nresult=keys_in_range(my_dict, start_range, end_range)\ntestFunc(test_input, expected, result)\n`,
                `\nmy_dict = {'John Doe': 25, 'Jane Smith': 30, 'Alice Johnson': 40, 'Bob Brown': 35, 'Sarah Müller': 28}\nstart_range = 20\nend_range = 50\nexpected = ['John Doe', 'Jane Smith', 'Alice Johnson', 'Bob Brown', 'Sarah Müller']\ntest_input = (my_dict, start_range, end_range)\nresult=keys_in_range(my_dict, start_range, end_range)\ntestFunc(test_input, expected, result)\n`,
            ];
        } else if (questionId == 8) { //phone book
            testCases = [`\nphone_book = { 'Jane Smith': {'address': '456 Maple Ave', 'phone_number': '555-5678'},} \ntest_input = (phone_book.copy(), 'Jane Smith', '{"address": "1000 Birch St", "phone_number": "555-8888"}') \nexpected = { 'Jane Smith': {'address': '1000 Birch St', 'phone_number': '555-8888'},}\nupdate_phone_book(phone_book, 'Jane Smith', '{"address": "1000 Birch St", "phone_number": "555-8888"}' )\ntestFunc(test_input, expected, phone_book)\n`,
                `\nphone_book = {'John Doe': {'address': '123 Oak St', 'phone_number': '555-1234'}}\ntest_input = (phone_book.copy(), 'John Doe', '{"address": "456 Elm St"}')\nexpected = {'John Doe': {'address': '456 Elm St', 'phone_number': '555-1234'}}\nupdate_phone_book(phone_book, 'John Doe', '{"address": "456 Elm St"}')\ntestFunc(test_input, expected, phone_book)\n`,
                `\nphone_book = {'John Doe': {'address': '123 Oak St', 'phone_number': '555-1234'}}\ntest_input = (phone_book.copy(),'John Doe', '{}')\nexpected = {'John Doe': {'address': '123 Oak St', 'phone_number': '555-1234'}}\nupdate_phone_book(phone_book, 'John Doe', '{}')\ntestFunc(test_input, expected, phone_book)\n`,
                `\nphone_book = {'Bob Smith': {'address': '321 Elm St', 'phone_number': '555-4321'}}\ntest_input = (phone_book.copy(),'Bob Smith', '{"address": "", "phone_number": ""}') \nexpected = {'Bob Smith': {'address': '', 'phone_number': ''}}\nupdate_phone_book(phone_book, 'Bob Smith', '{"address": "", "phone_number": ""}')\ntestFunc(test_input, expected, phone_book)\n`,
                `\nphone_book = {}\ntest_input = (phone_book.copy(), '', '{}')\nexpected = {}\nupdate_phone_book(phone_book, '', '{}')\ntestFunc(test_input, expected, phone_book)\n`,
            ];
        } else if (questionId == 4) { //scramble
            testCases = ["\ntest_input = 'a', 1 \nexpected = 'b'\nresult = scramble(*test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'z', 1\nexpected = 'a'\nresult = scramble(*test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'hello', 3\nexpected = 'khoor'\nresult = scramble(*test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'abcxyz', 3\nexpected = 'defabc'\nresult = scramble(*test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'test', 26\nexpected = 'test'\nresult = scramble(*test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'test', 0\nexpected = 'test'\nresult = scramble(*test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'test', -13\nexpected = 'grfg'\nresult = scramble(*test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'test', 13\nexpected = 'grfg'\nresult = scramble(*test_input)\ntestFunc(test_input, expected, result)\n",
            ];
        } else if (questionId == 5) { //arrange
            testCases = ["\ntest_input = 'abcabc'\nexpected = 'ccbbaa'\nresult = arrange(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'abc BCA'\nexpected = 'ABCcba'\nresult = arrange(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'Z1 x2 v*'\nexpected = 'Zxv'\nresult = arrange(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = '123 X 456'\nexpected = 'X'\nresult = arrange(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'asdf'\nexpected = 'sfda'\nresult = arrange(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'T12heZ3yrie1'\nexpected = 'TZyrihee'\nresult = arrange(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = '3asd32df asdsaf3'\nexpected = 'sssffdddaaa'\nresult = arrange(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = '<3I LOVE CS<3'\nexpected = 'CEILOSV'\nresult = arrange(test_input)\ntestFunc(test_input, expected, result)\n",
            ];
        } else if (questionId == 6) { //speak
            testCases = ["\ntest_input = 'Hi'\nexpected = 'H1'\nresult = speak(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'Test'\nexpected = '7357'\nresult = speak(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'Toast'\nexpected = '70457'\nresult = speak(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'Set a broken toe'\nexpected = '537 4 br0k3n 703'\nresult = speak(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'\nexpected = '4BCD3FGH1JKLMN0PQR57UVWXYZ'\nresult = speak(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'abcdefghijklmnopqrstuvwxyz'\nexpected = '4bcd3fgh1jklmn0pqr57uvwxyz'\nresult = speak(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'thezyrie'\nexpected = '7h3zyr13'\nresult = speak(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'CS ROCKS'\nexpected = 'C5 R0CK5'\nresult = speak(test_input)\ntestFunc(test_input, expected, result)\n",
            ];
        }
    }

    else if (classId == 'COMPSCI 101 Lab 12') {
        stringifiedTestFunction = '\ndef testFunc(input_given, expected, result):\n   if result == expected:\n       print("Test passed for input", input_given)\n       print()\n   else:\n       print("Test failed for input", input_given)\n       print("Expected result was", expected)\n       print("But actual result was", result)\n       print()\n';

        if (questionId == 1) { //rubiks
            testCases = ["\ntest_input = [['o', 'o', 'o'], ['o', 'o', 'o'], ['r', 'r', 'r']] \nexpected = False \nresult = rubiks_cube(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = [['g', 'b', 'y'], ['g', 'b', 'y'], ['g', 'b', 'y']] \nexpected = False \nresult = rubiks_cube(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = [['w', 'w', 'w'], ['w', 'w', 'w'], ['w', 'w', 'w']] \nexpected = True \nresult = rubiks_cube(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = [['g', 'g', 'g'], ['g', 'g', 'g'], ['g', 'g', 'g']] \nexpected = True \nresult = rubiks_cube(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = [['y', 'y', 'y'], ['y', 'y', 'y'], ['y', 'y', 'y']] \nexpected = True \nresult = rubiks_cube(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = [['b', 'b', 'b'], ['r', 'w', 'b'], ['r', 'o', 'o']] \nexpected = False \nresult = rubiks_cube(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = [['b', 'b', 'b'], ['b', 'b', 'b'], ['b', 'b', 'b']] \nexpected = True \nresult = rubiks_cube(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = [['g', 'b', 'y'], ['g', 'b', 'y'], ['g', 'r', 'r']] \nexpected = False \nresult = rubiks_cube(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = [['o', 'o', 'w'], ['o', 'o', 'w'], ['y', 'y', '']] \nexpected = False \nresult = rubiks_cube(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = [['o', 'g', 'g'], ['g', 'g', 'g'], ['g', 'g', 'g']] \nexpected = False \nresult = rubiks_cube(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = [['o', 'o', 'o'], ['o', 'o', 'o'], ['o', 'o', 'w']] \nexpected = False \nresult = rubiks_cube(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = [['r', 'r', 'r'], ['r', 'y', 'r'], ['r', 'r', 'r']] \nexpected = False \nresult = rubiks_cube(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = [['o', 'o', 'o'], ['o', 'o', 'o'], ['o', 'o', 'o']] \nexpected = True \nresult = rubiks_cube(test_input)\ntestFunc(test_input, expected, result)\n",

            ];
        } else if (questionId == 2) { //morse
            testCases = ["\ntest_input = '.... . .-.. .-.. ---'\nexpected = 'hello'\nresult = morse(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = '.- .--. .--. .-.. .'\nexpected = 'apple'\nresult = morse(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = '.--. .-. --- --. .-. .- --'\nexpected = 'program'\nresult = morse(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = '.-. .- -.-. . -.-. .- .-.'\nexpected = 'racecar'\nresult = morse(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = '.- .-.. .-.. .. --. .- - --- .-.'\nexpected = 'alligator'\nresult = morse(test_input)\ntestFunc(test_input, expected, result)\n",
                `\ntest_input = "--. .-. . . -. / --. .-. .- ... ..."\nexpected = 'green grass'\nresult = morse(test_input)\ntestFunc(test_input, expected, result)\n`,
                "\ntest_input = '... ..- -. -. -.--'\nexpected = 'sunny'\nresult = morse(test_input)\ntestFunc(test_input, expected, result)\n",
                `\ntest_input = ".--. . .--. .--. . .-. --- -. .. / .--. .. --.. --.. .-"\nexpected = 'pepperoni pizza'\nresult = morse(test_input)\ntestFunc(test_input, expected, result)\n`,
                `\ntest_input = ".-. --- ..- - . / -.... -...."\nexpected = 'route 66'\nresult = morse(test_input)\ntestFunc(test_input, expected, result)\n`,
                `\ntest_input = '... -.-. .-. .- - -.-. .... / . -- .----. / -.-. .- - ...'\nexpected = "scratch em' cats"\nresult = morse(test_input)\ntestFunc(test_input, expected, result)\n`,
                `\ntest_input = '.-- .- ... -. .----. - / - .... .- - / -.-. --- --- .-.. ..--..'\nexpected = "wasn't that cool?"\nresult = morse(test_input)\ntestFunc(test_input, expected, result)\n`,
                "\ntest_input = '.---- / --- .-. / - .-- --- ..--..'\nexpected = '1 or two?'\nresult = morse(test_input)\ntestFunc(test_input, expected, result)\n",
            ];

        } else if (questionId == 3) { //salary
            testCases = ["\ntest_input = ['Adam', 'Carl', 'Jacob'], [13000, 24000, 17000] \nexpected = ['Carl', 'Jacob', 'Adam']\nresult = salary(*test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = ['Sam', 'Martin', 'Alex'], [375, 250, 580] \nexpected = ['Alex', 'Sam', 'Martin'] \nresult = salary(*test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = ['Bob', 'Jimmy', 'Arthur'], [2600, 1300, 750] \nexpected = ['Bob', 'Jimmy', 'Arthur']\nresult = salary(*test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = ['Leo', 'Ted'], [28500, 43000] \nexpected = ['Ted', 'Leo'] \nresult = salary(*test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = ['Liam'], [27000]\nexpected = ['Liam']\nresult = salary(*test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = [], []\nexpected = []\nresult = salary(*test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = ['Lucas', 'Jack', 'Elijah', 'Henry'], [50000, 37000, 28000, 35000] \nexpected = ['Lucas', 'Jack', 'Henry', 'Elijah'] \nresult = salary(*test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = ['Ben', 'Abe'], [780, 780] \nexpected = ['Abe', 'Ben'] \nresult = salary(*test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = ['Alex', 'Jeb', 'James'], [1730, 1580, 1580] \nexpected = ['Alex', 'James', 'Jeb'] \nresult = salary(*test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = ['Daniel', 'Noah', 'Nathan'], [800, 250, 1010] \nexpected = ['Nathan', 'Daniel', 'Noah'] \nresult = salary(*test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = ['Michael', 'Ethan', 'Oliver', 'Perry', 'Dustin', 'John'], [1500, 1200, 1500, 700, 1500, 1370] \nexpected = ['Dustin', 'Michael', 'Oliver', 'John', 'Ethan', 'Perry'] \nresult = salary(*test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = ['Devin', 'Braden', 'Chase', 'Brent', 'Case', 'Melvin'], [1738, 34600, 900, 1234, 0, 1500]  \nexpected = ['Braden', 'Devin', 'Melvin', 'Brent', 'Chase', 'Case'] \nresult = salary(*test_input)\ntestFunc(test_input, expected, result)\n",
            ];
        }
    }
    else if (classId == '#2: PA2 (Programação e Algoritmos 2 - Programming and Algorithms 2)'
        || classId == 'Intro Python Dictionary +') {//'COMPSCI130 - Lab 10') {
        stringifiedTestFunction = '\ndef testFunc(input_given, expected, result):\n   if result == expected:\n       print("Test passed for input", input_given)\n       print()\n   else:\n       print("Test failed for input", input_given)\n       print("Expected result was", expected)\n       print("But actual result was", result)\n       print()\n';

        if (questionId == 4) { //keys in range
            testCases = [`\nmy_dict = {'John Doe': 25, 'Jane Smith': 30, 'Alice Johnson': 40, 'Bob Brown': 35, 'Sarah Müller': 28}\nstart_range = 30\nend_range = 40\nexpected = ['Jane Smith', 'Alice Johnson', 'Bob Brown']\ntest_input = (my_dict, start_range, end_range)\nresult=keys_in_range(my_dict, start_range, end_range)\ntestFunc(test_input, expected, result)\n`,
                `\nmy_dict = {'John Doe': 25, 'Jane Smith': 30, 'Alice Johnson': 40, 'Bob Brown': 35, 'Sarah Müller': 28}\nstart_range = 35\nend_range = 35\nexpected = ['Bob Brown']\ntest_input = (my_dict, start_range, end_range)\nresult=keys_in_range(my_dict, start_range, end_range)\ntestFunc(test_input, expected, result)\n`,
                `\nmy_dict = {'John Doe': 25, 'Jane Smith': 30, 'Alice Johnson': 40, 'Bob Brown': 35, 'Sarah Müller': 28}\nstart_range = 50\nend_range = 60\nexpected = []\ntest_input = (my_dict, start_range, end_range)\nresult=keys_in_range(my_dict, start_range, end_range)\ntestFunc(test_input, expected, result)\n`,
                `\nmy_dict = {'John Doe': 25, 'Jane Smith': 30, 'Alice Johnson': 40, 'Bob Brown': 35, 'Sarah Müller': 28}\nstart_range = 40\nend_range = 30\nexpected = []\ntest_input = (my_dict, start_range, end_range)\nresult=keys_in_range(my_dict, start_range, end_range)\ntestFunc(test_input, expected, result)\n`,
                `\nmy_dict = {'John Doe': 25, 'Jane Smith': 30, 'Alice Johnson': 40, 'Bob Brown': 35, 'Sarah Müller': 28}\nstart_range = 20\nend_range = 50\nexpected = ['John Doe', 'Jane Smith', 'Alice Johnson', 'Bob Brown', 'Sarah Müller']\ntest_input = (my_dict, start_range, end_range)\nresult=keys_in_range(my_dict, start_range, end_range)\ntestFunc(test_input, expected, result)\n`,
            ];
        } else if (questionId == 5) { //phone book
            testCases = [`\nphone_book = { 'Jane Smith': {'address': '456 Maple Ave', 'phone_number': '555-5678'},} \ntest_input = (phone_book.copy(), 'Jane Smith', '{"address": "1000 Birch St", "phone_number": "555-8888"}') \nexpected = { 'Jane Smith': {'address': '1000 Birch St', 'phone_number': '555-8888'},}\nupdate_phone_book(phone_book, 'Jane Smith', '{"address": "1000 Birch St", "phone_number": "555-8888"}' )\ntestFunc(test_input, expected, phone_book)\n`,
                `\nphone_book = {'John Doe': {'address': '123 Oak St', 'phone_number': '555-1234'}}\ntest_input = (phone_book.copy(), 'John Doe', '{"address": "456 Elm St"}')\nexpected = {'John Doe': {'address': '456 Elm St', 'phone_number': '555-1234'}}\nupdate_phone_book(phone_book, 'John Doe', '{"address": "456 Elm St"}')\ntestFunc(test_input, expected, phone_book)\n`,
                `\nphone_book = {'John Doe': {'address': '123 Oak St', 'phone_number': '555-1234'}}\ntest_input = (phone_book.copy(),'John Doe', '{}')\nexpected = {'John Doe': {'address': '123 Oak St', 'phone_number': '555-1234'}}\nupdate_phone_book(phone_book, 'John Doe', '{}')\ntestFunc(test_input, expected, phone_book)\n`,
                `\nphone_book = {'Bob Smith': {'address': '321 Elm St', 'phone_number': '555-4321'}}\ntest_input = (phone_book.copy(),'Bob Smith', '{"address": "", "phone_number": ""}') \nexpected = {'Bob Smith': {'address': '', 'phone_number': ''}}\nupdate_phone_book(phone_book, 'Bob Smith', '{"address": "", "phone_number": ""}')\ntestFunc(test_input, expected, phone_book)\n`,
                `\nphone_book = {}\ntest_input = (phone_book.copy(), '', '{}')\nexpected = {}\nupdate_phone_book(phone_book, '', '{}')\ntestFunc(test_input, expected, phone_book)\n`,
            ];
        } else if (questionId == 1) { //scramble
            testCases = ["\ntest_input = 'a', 1 \nexpected = 'b'\nresult = scramble(*test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'z', 1\nexpected = 'a'\nresult = scramble(*test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'hello', 3\nexpected = 'khoor'\nresult = scramble(*test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'abcxyz', 3\nexpected = 'defabc'\nresult = scramble(*test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'test', 26\nexpected = 'test'\nresult = scramble(*test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'test', 0\nexpected = 'test'\nresult = scramble(*test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'test', -13\nexpected = 'grfg'\nresult = scramble(*test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'test', 13\nexpected = 'grfg'\nresult = scramble(*test_input)\ntestFunc(test_input, expected, result)\n",
            ];
        } else if (questionId == 2) { //arrange
            testCases = ["\ntest_input = 'abcabc'\nexpected = 'ccbbaa'\nresult = arrange(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'abc BCA'\nexpected = 'ABCcba'\nresult = arrange(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'Z1 x2 v*'\nexpected = 'Zxv'\nresult = arrange(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = '123 X 456'\nexpected = 'X'\nresult = arrange(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'asdf'\nexpected = 'sfda'\nresult = arrange(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'T12heZ3yrie1'\nexpected = 'TZyrihee'\nresult = arrange(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = '3asd32df asdsaf3'\nexpected = 'sssffdddaaa'\nresult = arrange(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = '<3I LOVE CS<3'\nexpected = 'CEILOSV'\nresult = arrange(test_input)\ntestFunc(test_input, expected, result)\n",
            ];
        } else if (questionId == 3) { //speak
            testCases = ["\ntest_input = 'Hi'\nexpected = 'H1'\nresult = speak(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'Test'\nexpected = '7357'\nresult = speak(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'Toast'\nexpected = '70457'\nresult = speak(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'Set a broken toe'\nexpected = '537 4 br0k3n 703'\nresult = speak(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'\nexpected = '4BCD3FGH1JKLMN0PQR57UVWXYZ'\nresult = speak(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'abcdefghijklmnopqrstuvwxyz'\nexpected = '4bcd3fgh1jklmn0pqr57uvwxyz'\nresult = speak(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'thezyrie'\nexpected = '7h3zyr13'\nresult = speak(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'CS ROCKS'\nexpected = 'C5 R0CK5'\nresult = speak(test_input)\ntestFunc(test_input, expected, result)\n",
            ];
        }
    }

    else if (classId == "Java") {
        language = 'java';

        if (questionId == 1) { //scramble
            stringifiedTestFunction = 'static void testFunc(String input_given, int input_given_2, String expected, String result) {        if (result.equals(expected)) {            System.out.println("Test passed for input " + input_given + " , " + input_given_2);            System.out.println();        } else {            System.out.println("Test failed for input " + input_given+ " , " + input_given_2);            System.out.println("Expected result was " + expected);            System.out.println("But actual result was " + result);            System.out.println();        }    }'
            testCases = ['String test_input = "a";        int test_input_2 = 1;        String expected = "b";        String result = scramble(test_input, test_input_2);        testFunc(test_input, test_input_2, expected, result); return;',
                'String test_input = "z";        int test_input_2 = 1;        String expected = "a";        String result = scramble(test_input, test_input_2);        testFunc(test_input, test_input_2, expected, result);',
                'String test_input = "hello";        int test_input_2 = 3;        String expected = "khoor";        String result = scramble(test_input, test_input_2);        testFunc(test_input, test_input_2, expected, result);return;',
                'String test_input = "abcxyz";        int test_input_2 = 3;        String expected = "defabc";        String result = scramble(test_input, test_input_2);        testFunc(test_input, test_input_2, expected, result);return;',
                'String test_input = "test";        int test_input_2 = 26;        String expected = "test";        String result = scramble(test_input, test_input_2);        testFunc(test_input, test_input_2, expected, result);return;',
                'String test_input = "test";        int test_input_2 = 0;        String expected = "test";        String result = scramble(test_input, test_input_2);        testFunc(test_input, test_input_2, expected, result);return;',
                'String test_input = "test";        int test_input_2 = -13;        String expected = "grfg";        String result = scramble(test_input, test_input_2);        testFunc(test_input, test_input_2, expected, result);return;',
                'String test_input = "test";        int test_input_2 = 13;        String expected = "grfg";        String result = scramble(test_input, test_input_2);        testFunc(test_input, test_input_2, expected, result);return;',
            ];
        } else if (questionId == 2) { //arrange
            stringifiedTestFunction = ' static void testFunc(String input_given, String expected, String result) {        if (result.equals(expected)) {            System.out.println("Test passed for input " + input_given);            System.out.println();        } else {            System.out.println("Test failed for input " + input_given);            System.out.println("Expected result was " + expected);            System.out.println("But actual result was " + result);            System.out.println();        }    }';

            testCases = ['String test_input = "abcabc";        String expected = "ccbbaa";        String result = arrange(test_input);        testFunc(test_input, expected, result);',
                'String test_input = "abc BCA";        String expected = "ABCcba";        String result = arrange(test_input);        testFunc(test_input, expected, result);',
                'String test_input = "Z1 x2 v*";        String expected = "Zxv";        String result = arrange(test_input);        testFunc(test_input, expected, result);',
                'String test_input = "123 X 456";        String expected = "X";        String result = arrange(test_input);        testFunc(test_input, expected, result);',
                'String test_input = "asdf";        String expected = "sfda";        String result = arrange(test_input);        testFunc(test_input, expected, result);',
                'String test_input = "T12heZ3yrie1";        String expected = "TZyrihee";        String result = arrange(test_input);        testFunc(test_input, expected, result);',
                'String test_input = "3asd32df asdsaf3";        String expected = "sssffdddaaa";        String result = arrange(test_input);        testFunc(test_input, expected, result);',
                'String test_input = "<3I LOVE CS<3";        String expected = "CEILOSV";        String result = arrange(test_input);        testFunc(test_input, expected, result);',
            ];
        } else if (questionId == 3) { //speak
            stringifiedTestFunction = 'static void testFunc(String input_given, String expected, String result) {        if (result.equals(expected)) {            System.out.println("Test passed for input " + input_given);            System.out.println();        } else {            System.out.println("Test failed for input " + input_given);            System.out.println("Expected result was " + expected);            System.out.println("But actual result was " + result);            System.out.println();        }    }';

            testCases = ['String test_input = "Hi";String expected = "H1";String result = speak(test_input);testFunc(test_input, expected, result);',
                'String test_input = "Test";String expected = "7357";String result = speak(test_input);testFunc(test_input, expected, result);',
                'String test_input = "Toast";String expected = "70457";String result = speak(test_input);testFunc(test_input, expected, result);',
                'String test_input = "Set a broken toe";String expected = "537 4 br0k3n 703";String result = speak(test_input);testFunc(test_input, expected, result);',
                'String test_input = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";String expected = "4BCD3FGH1JKLMN0PQR57UVWXYZ";String result = speak(test_input);testFunc(test_input, expected, result);',
                'String test_input = "abcdefghijklmnopqrstuvwxyz";String expected = "4bcd3fgh1jklmn0pqr57uvwxyz";String result = speak(test_input);testFunc(test_input, expected, result);',
                'String test_input = "thezyrie";String expected = "7h3zyr13";String result = speak(test_input);testFunc(test_input, expected, result);',
                'String test_input = "CS ROCKS";String expected = "C5 R0CK5";String result = speak(test_input);testFunc(test_input, expected, result);',
            ];
        }
    }

    else if (classId == 'COMPSCI101 - Lab 11' || classId == 'Intro Python Functions Part 2' || classId == "ACU CS 120 (Programming 1)" || classId == 'COMPSCI 101 Lab 11') {
        stringifiedTestFunction = '\ndef testFunc(input_given, expected, result):\n   if result == expected:\n       print("Test passed for input", input_given)\n       print()\n   else:\n       print("Test failed for input", input_given)\n       print("Expected result was", expected)\n       print("But actual result was", result)\n       print()\n';

        if (questionId == 1) { //scramble
            testCases = ["\ntest_input = 'a', 1 \nexpected = 'b'\nresult = scramble(*test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'z', 1\nexpected = 'a'\nresult = scramble(*test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'hello', 3\nexpected = 'khoor'\nresult = scramble(*test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'abcxyz', 3\nexpected = 'defabc'\nresult = scramble(*test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'test', 26\nexpected = 'test'\nresult = scramble(*test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'test', 0\nexpected = 'test'\nresult = scramble(*test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'test', -13\nexpected = 'grfg'\nresult = scramble(*test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'test', 13\nexpected = 'grfg'\nresult = scramble(*test_input)\ntestFunc(test_input, expected, result)\n",
            ];
        } else if (questionId == 2) { //arrange
            testCases = ["\ntest_input = 'abcabc'\nexpected = 'ccbbaa'\nresult = arrange(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'abc BCA'\nexpected = 'ABCcba'\nresult = arrange(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'Z1 x2 v*'\nexpected = 'Zxv'\nresult = arrange(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = '123 X 456'\nexpected = 'X'\nresult = arrange(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'asdf'\nexpected = 'sfda'\nresult = arrange(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'T12heZ3yrie1'\nexpected = 'TZyrihee'\nresult = arrange(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = '3asd32df asdsaf3'\nexpected = 'sssffdddaaa'\nresult = arrange(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = '<3I LOVE CS<3'\nexpected = 'CEILOSV'\nresult = arrange(test_input)\ntestFunc(test_input, expected, result)\n",
            ];
        } else if (questionId == 3) { //speak
            testCases = ["\ntest_input = 'Hi'\nexpected = 'H1'\nresult = speak(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'Test'\nexpected = '7357'\nresult = speak(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'Toast'\nexpected = '70457'\nresult = speak(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'Set a broken toe'\nexpected = '537 4 br0k3n 703'\nresult = speak(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'\nexpected = '4BCD3FGH1JKLMN0PQR57UVWXYZ'\nresult = speak(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'abcdefghijklmnopqrstuvwxyz'\nexpected = '4bcd3fgh1jklmn0pqr57uvwxyz'\nresult = speak(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'thezyrie'\nexpected = '7h3zyr13'\nresult = speak(test_input)\ntestFunc(test_input, expected, result)\n",
                "\ntest_input = 'CS ROCKS'\nexpected = 'C5 R0CK5'\nresult = speak(test_input)\ntestFunc(test_input, expected, result)\n",
            ];
        }
    }


    else if (classId == 'ENGGEN 131 - LAB 9' || classId == 'Intro C - simple') {
        language = 'c';
        if (questionId == 1) { //average list
            testCases = ["\n\nint main() {\n    int input1[] =  {5, 5, 5, 5, 5}; int copyInput1[] =  {5, 5, 5, 5, 5}; int inputSize = sizeof(input1) / sizeof(input1[0]); int expected[]= {5, 5, 5, 5, 5} ; Average(input1, inputSize); testFunc(copyInput1, inputSize, input1, expected, sizeof(expected) / sizeof(expected[0]));\n}\n",
                "\n\nint main() {\n    int input1[] = {7}; int copyInput1[] = {7}; int inputSize = sizeof(input1) / sizeof(input1[0]); int expected[]= {7}; Average(input1, inputSize); testFunc(copyInput1, inputSize, input1, expected, sizeof(expected) / sizeof(expected[0]));\n}\n",
                "\n\nint main() {\n    int input1[] = {2,4,6,8}; int copyInput1[] = {2,4,6,8}; int inputSize = sizeof(input1) / sizeof(input1[0]); int expected[]= {5, 5, 5, 5}; Average(input1, inputSize); testFunc(copyInput1, inputSize, input1, expected, sizeof(expected) / sizeof(expected[0]));\n}\n",
                "\n\nint main() {\n    int input1[] = {10, 20, 30, 40, 50, 60};int copyInput1[] = {10, 20, 30, 40, 50, 60}; int inputSize = sizeof(input1) / sizeof(input1[0]); int expected[]= {35, 35, 35, 35, 35, 35}; Average(input1, inputSize); testFunc(copyInput1, inputSize, input1, expected, sizeof(expected) / sizeof(expected[0]));\n}\n",
                "\n\nint main() {\n    int input1[] = {0, 0, 0, 0};int copyInput1[] = {0, 0, 0, 0}; int inputSize = sizeof(input1) / sizeof(input1[0]); int expected[]= {0, 0, 0, 0}; Average(input1, inputSize); testFunc(copyInput1, inputSize, input1, expected, sizeof(expected) / sizeof(expected[0]));\n}\n",
                "\n\nint main() {\n    int input1[] = {0, 10}; int copyInput1[] = {0, 10}; int inputSize = sizeof(input1) / sizeof(input1[0]); int expected[]= {5, 5}; Average(input1, inputSize); testFunc(copyInput1, inputSize, input1, expected, sizeof(expected) / sizeof(expected[0]));\n}\n",
                "\n\nint main() {\n    int input1[] = {0, 5, 10, 15, 20} ; int copyInput1[] = {0, 5, 10, 15, 20} ; int inputSize = sizeof(input1) / sizeof(input1[0]); int expected[]= {10, 10, 10, 10, 10}; Average(input1, inputSize); testFunc(copyInput1, inputSize, input1, expected, sizeof(expected) / sizeof(expected[0]));\n}\n",
                "\n\nint main() {\n    int input1[] = {10, 11, 12, 13, 14}; int copyInput1[] = {10, 11, 12, 13, 14} ; int inputSize = sizeof(input1) / sizeof(input1[0]); int expected[]=  {12, 12, 12, 12, 12}; Average(input1, inputSize); testFunc(copyInput1, inputSize, input1, expected, sizeof(expected) / sizeof(expected[0]));\n}\n",
                "\n\nint main() {\n    int input1[] = {1, 1, 3, 3, 5, 5}; int copyInput1[] = {1, 1, 3, 3, 5, 5}  ; int inputSize = sizeof(input1) / sizeof(input1[0]); int expected[]=  {3, 3, 3, 3, 3, 3}; Average(input1, inputSize); testFunc(copyInput1, inputSize, input1, expected, sizeof(expected) / sizeof(expected[0]));\n}\n",

            ];
            stringifiedTestFunction = '#include <stdio.h>\n#include <stdbool.h>\n#include <stdlib.h>\n\nbool arraysEqual(const int arr1[], const int arr2[], int size) { for (int i = 0; i < size; i++) { if (arr1[i] != arr2[i]) { return false; } } return true; } void testFunc(int input[], int inputSize, int output[], int expectedOutput[], int expectedSize) { if (arraysEqual(output, expectedOutput, expectedSize)) { printf(\"Test passed for input: [\"); for (int i = 0; i < inputSize; i++) { printf(\"%d\", input[i]); if (i < inputSize - 1) { printf(\", \"); } } printf(\"]\\n\\n\"); } else { printf(\"Test failed for input: [\"); for (int i = 0; i < inputSize; i++) { printf(\"%d\", input[i]); if (i < inputSize - 1) { printf(\", \"); } } printf(\"]\\nExpected result was [\"); for (int i = 0; i < expectedSize; i++) { printf(\"%d\", expectedOutput[i]); if (i < expectedSize - 1) { printf(\", \"); } } printf(\"]\\nBut actual result was [\"); for (int i = 0; i < inputSize; i++) { printf(\"%d\", output[i]); if (i < inputSize - 1) { printf(\", \"); } } printf(\"]\\n\\n\"); } }';
        } else if (questionId == 2) { //sum even numbers
            testCases = ["\n\nint main() {\n    int input1[] = {-5,-4,-3,-2,-1}; int expected = -6; int result = Sum(input1, sizeof(input1) / sizeof(input1[0])); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
                "\n\nint main() {\n    int input1[] = {1,2,3,4,5}; int expected = 6; int result = Sum(input1, sizeof(input1) / sizeof(input1[0])); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
                "\n\nint main() {\n    int input1[] = {2,4,6,8,10}; int expected = 30; int result = Sum(input1, sizeof(input1) / sizeof(input1[0])); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
                "\n\nint main() {\n    int input1[] = {-6,-5,4,5,6}; int expected = 4; int result = Sum(input1, sizeof(input1) / sizeof(input1[0])); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
                "\n\nint main() {\n    int input1[] = {7}; int expected = 0; int result = Sum(input1, sizeof(input1) / sizeof(input1[0])); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
                "\n\nint main() {\n    int input1[] = {8}; int expected = 8; int result = Sum(input1, sizeof(input1) / sizeof(input1[0])); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
                "\n\nint main() {\n    int input1[] = {-2,-4,2,4}; int expected = 0; int result = Sum(input1, sizeof(input1) / sizeof(input1[0])); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
            ];
            stringifiedTestFunction = '\nvoid testFunc(int input_given[], int size, int expected, int result) {\n    if (result == expected) {\n        printf(\"Test passed for input: [\");\n        for (int i = 0; i < size; i++) {\n            printf(\"%d\", input_given[i]);\n            if (i < size - 1) {\n                printf(\", \");\n            }\n        }\n        printf(\"]\\n\\n\");\n    } else {\n        printf(\"Test failed for input: [\");\n        for (int i = 0; i < size; i++) {\n            printf(\"%d\", input_given[i]);\n            if (i < size - 1) {\n                printf(\", \");\n            }\n        }\n        printf(\"]\\nExpected result was %d\\nBut actual result was %d\\n\\n\", expected, result);\n    }\n}';
        } else if (questionId == 3) { //Find
            testCases = ["\n\nint main() {\n    int input1[] = {1,2,3,0,5,6}; int expected = 3; int result = Find(input1, sizeof(input1) / sizeof(input1[0])); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
                "\n\nint main() {\n    int input1[] = {0,2,3,4,5,6}; int expected = 0; int result = Find(input1, sizeof(input1) / sizeof(input1[0])); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
                "\n\nint main() {\n    int input1[] = {1,2,3,4,5,0}; int expected = 5; int result = Find(input1, sizeof(input1) / sizeof(input1[0])); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
                "\n\nint main() {\n    int input1[] = {1, 2, 3, 4, 0, 5, 0}; int expected = 6; int result = Find(input1, sizeof(input1) / sizeof(input1[0])); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
                "\n\nint main() {\n    int input1[] = {0, 1, 0, 2, 3, 0, 4}; int expected = 5; int result = Find(input1, sizeof(input1) / sizeof(input1[0])); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
                "\n\nint main() {\n    int input1[] = {0, 0, 0, 0, 1, 2, 3}; int expected = 3; int result = Find(input1, sizeof(input1) / sizeof(input1[0])); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
            ];
            stringifiedTestFunction = '\nvoid testFunc(int input_given[], int size, int expected, int result) {\n    if (result == expected) {\n        printf(\"Test passed for input: [\");\n        for (int i = 0; i < size; i++) {\n            printf(\"%d\", input_given[i]);\n            if (i < size - 1) {\n                printf(\", \");\n            }\n        }\n        printf(\"]\\n\\n\");\n    } else {\n        printf(\"Test failed for input: [\");\n        for (int i = 0; i < size; i++) {\n            printf(\"%d\", input_given[i]);\n            if (i < size - 1) {\n                printf(\", \");\n            }\n        }\n        printf(\"]\\nExpected result was %d\\nBut actual result was %d\\n\\n\", expected, result);\n    }\n}';
        }
    }
    else if (classId == 'ENGGEN 131 - LAB 12' || classId == 'Intro C - advanced') {
        language = 'c';
        if (questionId == 3) { //leaf eater
            //was able with code edit not without
            // "Write me a C function called LeafEater that takes in 3 integers and returns an int. The first parameter is at which interval we can collect leaves, second int x is at which interval there's a leaf (so if 4 that means there's a leaf at 0,4,8,etc) , and last one 'n' is how many nodes there are(leaves are on nodes). The function should return how many leaves we land on given the parameters. the result should be the count + 1. so if given 2,4,11 it should return 3. 5, 2, 7 should return 2";


            // "chatGPTresponse": "\n\nint LeafEater(int interval, int x, int n){\n    int count = 0;\n    for (int i = 0; i < n; i++) {\n        if ((i + 1) % interval == 0 && (i + 1) % x == 0) {\n            count++;\n        }\n    }\n    return count + 1;\n}";

            testCases = [
                "\n\nint main() {\n    int input1[] = {1,1,5}; int expected = 6; int result = LeafEater(1,1,5); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
                "\n\nint main() {\n    int input1[] = {2,4,11}; int expected = 3; int result = LeafEater(2,4,11); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
                "\n\nint main() {\n    int input1[] = {3,4,11}; int expected = 1; int result = LeafEater(3,4,11); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
                "\n\nint main() {\n    int input1[] = {5,2,7}; int expected = 1; int result = LeafEater(5,2,7); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
                "\n\nint main() {\n    int input1[] = {4,6,20}; int expected = 2; int result = LeafEater(4,6,20); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
                "\n\nint main() {\n    int input1[] = {3,3,10}; int expected = 4; int result = LeafEater(3,3,10); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
            ];
            stringifiedTestFunction = '\nvoid testFunc(int input_given[], int size, int expected, int result) {\n    if (result == expected) {\n        printf(\"Test passed for input: [\");\n        for (int i = 0; i < size; i++) {\n            printf(\"%d\", input_given[i]);\n            if (i < size - 1) {\n                printf(\", \");\n            }\n        }\n        printf(\"]\\n\\n\");\n    } else {\n        printf(\"Test failed for input: [\");\n        for (int i = 0; i < size; i++) {\n            printf(\"%d\", input_given[i]);\n            if (i < size - 1) {\n                printf(\", \");\n            }\n        }\n        printf(\"]\\nExpected result was %d\\nBut actual result was %d\\n\\n\", expected, result);\n    }\n}';
        } else if (questionId == 1) { //simple queen
            // Write me a C function called TwoQueens takes in a 2 dimensional int array representing a chess board. the arrays consists of 0 and 1. There is one 1 for the black queen and one 1 for the white queen.  if the black queen is on the direct path of the white queen (diagonal, horizontal or vertical) return 0 otherwise return 1. add any imports you need

            testCases = [
                "\n\nint main() {\n    int input1[][8] = {{0, 0, 0, 0, 0, 0, 0, 0},{0, 0, 1, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 1, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}}; int expected = 1; int result = TwoQueens(input1); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
                "\n\nint main() {\n    int input1[][8] = {{0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 1, 0, 0, 1, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}}; int expected = 0; int result = TwoQueens(input1); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
                "\n\nint main() {\n    int input1[][8] = {{0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 1, 0, 0, 0, 0, 0}, {0, 0, 0, 1, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}}; int expected = 0; int result = TwoQueens(input1); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
                "\n\nint main() {\n    int input1[][8] = {{1, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 1}} ; int expected = 0; int result = TwoQueens(input1); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
                "\n\nint main() {\n    int input1[][8] = {{0, 0, 0, 0, 0, 0, 0, 1}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {1, 0, 0, 0, 0, 0, 0, 0}}; int expected = 0; int result = TwoQueens(input1); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
                "\n\nint main() {\n    int input1[][8] = {{0, 1, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 1, 0, 0, 0, 0, 0, 0}}; int expected = 0; int result = TwoQueens(input1); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
                "\n\nint main() {\n    int input1[][8] = {{0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 1, 0, 0, 0, 0}, {0, 0, 0, 1, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}}; int expected = 0; int result = TwoQueens(input1); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
                "\n\nint main() {\n    int input1[][8] =  {{0, 0, 0, 0, 0, 1, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 1, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}}; int expected = 1; int result = TwoQueens(input1); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
                "\n\nint main() {\n    int input1[][8] =  {{0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 1, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 1, 0, 0, 0, 0}}; int expected = 1; int result = TwoQueens(input1); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
            ];

            stringifiedTestFunction = '\nvoid testFunc(int input_given[][8], int size, int expected, int result) {\n\
                if (result == expected) {\n\
                    printf(\"Test passed for input: [\");\n\
                    for (int i = 0; i < size; i++) {\n\
                        printf(\"[\");\n\
                        for (int j = 0; j < 8; j++) {\n\
                            printf(\"%d\", input_given[i][j]);\n\
                            if (j < 7) {\n\
                                printf(\", \");\n\
                            }\n\
                        }\n\
                        printf(\"]\");\n\
                        if (i < size - 1) {\n\
                            printf(\", \");\n\
                        }\n\
                    }\n\
                    printf(\"]\\n\\n\");\n\
                } else {\n\
                    printf(\"Test failed for input: [\");\n\
                    for (int i = 0; i < size; i++) {\n\
                        printf(\"[\");\n\
                        for (int j = 0; j < 8; j++) {\n\
                            printf(\"%d\", input_given[i][j]);\n\
                            if (j < 7) {\n\
                                printf(\", \");\n\
                            }\n\
                        }\n\
                        printf(\"]\");\n\
                        if (i < size - 1) {\n\
                            printf(\", \");\n\
                        }\n\
                    }\n\
                    printf(\"]\\nExpected result was %d\\nBut actual result was %d\\n\\n\", expected, result);\n\
                }\n\
            }';
        } else if (questionId == 2) { //complex queen
            // Write me a C function called FullQueens takes in a 2 dimensional int array representing a chess board. the arrays consists of 0 and 1. 1 represents the presence of a queen, 0 is an empty spot.  if any queen is on the direct path of another queen (diagonal, horizontal or vertical) return the int 0 otherwise return the int 1. add any imports you need
            testCases = [
                "\n\nint main() {\n    int input1[][8] = {{0, 0, 0, 0, 0, 1, 0, 0}, {0, 0, 0, 1, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 1, 0}, {1, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 1}, {0, 1, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 1, 0, 0, 0}, {0, 0, 1, 0, 0, 0, 0, 0}}; int expected = 1; int result = FullQueens(input1); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
                "\n\nint main() {\n    int input1[][8] = {{0, 0, 0, 0, 1, 0, 0, 0}, {0, 1, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 1, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 1, 0}, {0, 0, 1, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 1}, {0, 0, 0, 0, 0, 1, 0, 0}, {1, 0, 0, 0, 0, 0, 0, 0}}; int expected = 1; int result = FullQueens(input1); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
                "\n\nint main() {\n    int input1[][8] = {{0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 1, 0, 0, 0, 0, 0}, {0, 0, 0, 1, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 0}}; int expected = 0; int result = FullQueens(input1); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
                "\n\nint main() {\n    int input1[][8] = {{0, 0, 0, 0, 0, 0, 0, 1}, {0, 0, 0, 0, 1, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 1, 0}, {0, 0, 1, 0, 0, 0, 0, 0}, {1, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 1, 0, 0}, {0, 0, 0, 1, 0, 0, 0, 0}, {0, 1, 0, 0, 0, 0, 0, 0}} ; int expected = 0; int result = FullQueens(input1); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
                "\n\nint main() {\n    int input1[][8] = {{1, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 1, 0}, {0, 1, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 1, 0, 0, 0, 0}, {1, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 1}, {0, 0, 0, 0, 0, 0, 1, 0}, {0, 1, 0, 0, 0, 0, 0, 0}}; int expected = 0; int result = FullQueens(input1); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
                "\n\nint main() {\n    int input1[][8] = {{0, 0, 0, 0, 0, 1, 0, 0}, {0, 0, 0, 1, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 1, 0}, {1, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 1}, {0, 1, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 1, 0, 0, 0}, {0, 0, 1, 0, 0, 0, 0, 0}}; int expected = 1; int result = FullQueens(input1); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
                "\n\nint main() {\n    int input1[][8] = {{0, 0, 0, 1, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 1, 0}, {1, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 1}, {0, 0, 0, 0, 1, 0, 0, 0}, {0, 1, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 1, 0, 0}, {0, 0, 1, 0, 0, 0, 0, 0}} ; int expected = 1; int result = FullQueens(input1); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
                "\n\nint main() {\n    int input1[][8] =  {{0, 0, 1, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 1, 0, 0}, {1, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 1}, {0, 0, 0, 0, 1, 0, 0, 0}, {0, 1, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 1, 0, 0}, {0, 0, 0, 1, 0, 0, 0, 0}}; int expected = 0; int result = FullQueens(input1); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
                "\n\nint main() {\n    int input1[][8] =  {{0, 0, 0, 1, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 1, 0, 0}, {1, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 1}, {0, 0, 0, 0, 1, 0, 0, 0}, {0, 1, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 1, 0, 0}, {0, 0, 1, 0, 0, 0, 0, 0}}; int expected = 0; int result = FullQueens(input1); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
                "\n\nint main() {\n    int input1[][8] =  {{0, 0, 0, 1, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 1, 0}, {1, 0, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 0, 0, 1}, {0, 0, 0, 0, 1, 0, 0, 0}, {0, 1, 0, 0, 0, 0, 0, 0}, {0, 0, 0, 0, 0, 1, 0, 0}, {0, 0, 0, 0, 0, 0, 1, 0}}; int expected = 0; int result = FullQueens(input1); testFunc(input1, sizeof(input1) / sizeof(input1[0]), expected, result);\n}\n",
            ];
            stringifiedTestFunction = '\nvoid testFunc(int input_given[][8], int size, int expected, int result) {\n\
                if (result == expected) {\n\
                    printf(\"Test passed for input: [\");\n\
                    for (int i = 0; i < size; i++) {\n\
                        printf(\"[\");\n\
                        for (int j = 0; j < 8; j++) {\n\
                            printf(\"%d\", input_given[i][j]);\n\
                            if (j < 7) {\n\
                                printf(\", \");\n\
                            }\n\
                        }\n\
                        printf(\"]\");\n\
                        if (i < size - 1) {\n\
                            printf(\", \");\n\
                        }\n\
                    }\n\
                    printf(\"]\\n\\n\");\n\
                } else {\n\
                    printf(\"Test failed for input: [\");\n\
                    for (int i = 0; i < size; i++) {\n\
                        printf(\"[\");\n\
                        for (int j = 0; j < 8; j++) {\n\
                            printf(\"%d\", input_given[i][j]);\n\
                            if (j < 7) {\n\
                                printf(\", \");\n\
                            }\n\
                        }\n\
                        printf(\"]\");\n\
                        if (i < size - 1) {\n\
                            printf(\", \");\n\
                        }\n\
                    }\n\
                    printf(\"]\\nExpected result was %d\\nBut actual result was %d\\n\\n\", expected, result);\n\
                }\n\
            }';
        }
    }
    return [testCases, stringifiedTestFunction, language, testType];
};

exports.downloadDataAsJson = functions.https.onRequest(async (req, res) => {
    cors(req, res, async () => {
        try {
            const classId = req.body.data.class;
            const snapshot = await getFirestore()
                .collection(classId.replace(/\s+/g, ''))
                .where('userEmail', 'not-in', ['thezyrie@gmail.com', 'paul.denny@gmail.com', 'messionyk@gmail.com'])
                .get()
            const data = snapshot.docs.map(doc => {
                return {
                    id: doc.id,
                    ...doc.data()
                };
            });
            res.send({
                "status": 200,
                "data": {
                    data
                }
            });
            // res.status(200).json(data);
        } catch (error) {
            console.error('Error getting document:', error);
            res.status(500).send('Error getting document');
        }
    });
});

exports.downloadSuccessAsJson = functions.https.onRequest(async (req, res) => {
    cors(req, res, async () => {
        try {
            const snapshot = await getFirestore()
                .collection('question_success_tracker')
                .where('userEmail', 'not-in', ['thezyrie@gmail.com', 'paul.denny@gmail.com', 'messionyk@gmail.com'])
                .get()
            const data = snapshot.docs.map(doc => doc.data());
            res.send({
                "status": 200,
                "data": {
                    data
                }
            });
            // res.status(200).json(data);
        } catch (error) {
            console.error('Error getting document:', error);
            res.status(500).send('Error getting document');
        }
    });
});

exports.userState = functions.https.onRequest(async (req, res) => {
    cors(req, res, async () => {
        try {
            const auth = admin.auth();
            const user = await auth.getUser(req.body.data.user);
            const userEmail = user.email;
            const classId = req.body.data.class;
            // Query Firestore collection based on email and classId
            const querySnapshot = await admin.firestore()
                .collection('question_success_tracker')
                .where('userEmail', '==', userEmail)
                .where('classId', '==', classId)
                .get();

            // Process query results
            const documents = [];
            querySnapshot.forEach(doc => {
                documents.push(doc.data());
            });

            // Send response with query results
            res.send({
                "status": 200,
                "data": {
                    documents
                }
            });
            // res.status(200).json(data);
        } catch (error) {
            console.error('Error getting document:', error);
            res.status(500).send('Error getting document');
        }
    });
});

exports.tryPrompt = functions.runWith({ timeoutSeconds: 300 }).https.onRequest(async (req, res) => {
    cors(req, res, async () => {
        try {
            const prompt = req.body.data.prompt;
            const questionId = req.body.data.exercise;
            const classId = req.body.data.class;
            const group = req.body.data.group;
            const promptLanguage = req.body.data.promptLanguage;
            if (!prompt) {
                res.status(422).json({ error: 'Uh oh, no prompt was provided' });
                return;
            } else if (!classId || !questionId || !group) {
                res.status(422).json({ error: 'Uh oh, your request is missing data. Try refreshing your browser!' });
                return;
            }
            const clientIP = req.headers['x-forwarded-for'] || req.headers['fastly-client-ip'] || req.socket?.remoteAddress;
            const userIp = clientIP || 0;
            const uid = req.body.data.user;

            const auth = admin.auth();
            const user = await auth.getUser(uid);
            if (!user) {
                res.status(422).json({ error: "Uh oh, login failed. Close this browser and open a new session" });
                return;
            }
            const userEmail = user.email;
            let chatGPTResult = ''

            let stringifiedTestFunction = '';
            let testCases = [];
            let testType = 'function'
            let language = 'python';
            let stdout = '';
            let stderr = '';
            let testResult = '';
            log('classId', classId);
            log('questionId', questionId);
            log('group', group);

            [testCases, stringifiedTestFunction, language, testType] = testCaseGenerator(classId, questionId);

            chatGPTResult = await askOpenai(prompt, language, testType);

            if (!chatGPTResult) {
                log("Uh oh, ChatGPT is not working as expected. Your prompt might be triggering the limit! Try something else or try again later");
                return;
            } else {
                const resp = await testCode(chatGPTResult, language, testCases, stringifiedTestFunction, testType);

                if (resp) {
                    stdout = resp.stdout;
                    stderr = resp.stderr;
                    testResult = resp.testResult;
                } else {
                    log("Uh oh, Jobe is not working as expected. The code might be faulty. Try something else or try again later");
                    return;
                }
            }

            let timestamp = new Date();
            let attempt = {
                userIp: userIp,
                classId: classId,
                questionId: questionId,
                group: group,
                userEmail: userEmail,
                prompt: prompt,
                chatGPTresponse: chatGPTResult,
                stdout: stdout,
                stderr: stderr,
                testResult: testResult,
                created: timestamp.toISOString()
            };

            const docRef = await getFirestore()
                .collection(classId.replace(/\s+/g, ''))
                .add(attempt);

            testStatus = stdout.includes('Test passed');
            if (stdout.includes('Test failed') || stderr != '') {
                testStatus = false;
            }
            if (chatGPTResult == '') {
                testStatus = false
                stderr = "ChatGPT did not return code（πーπ）"
            }

            const remoteConfig = getRemoteConfig();

            const template = await remoteConfig.getTemplate();
            const gamification = template.parameters['gamification'].defaultValue.value;

            if (classId.includes('COMPSCI 101') && testStatus) {

                const { robustnessScore, topRobustness, wordCount, topWordCount } = await storeSuccess(userEmail, prompt, classId, questionId, docRef.id, promptLanguage);

                res.send({
                    "status": 201,
                    "data": {
                        chatGPTresponse: chatGPTResult,
                        testStatus: testStatus,
                        stderr: stderr,
                        topRobustness: topRobustness,
                        robustness: robustnessScore,
                        topVerbosity: topWordCount,
                        verbosity: wordCount,
                        testResult: testResult,
                        created: timestamp.toISOString()
                    }
                });
            } else {
                res.send({
                    "status": 201,
                    "data": {
                        chatGPTresponse: chatGPTResult,
                        testStatus: testStatus,
                        stderr: stderr,
                        testResult: testResult,
                        created: timestamp.toISOString()
                    }
                });
            }

            return;
        } catch (e) {
            console.error('something went wrong, exception: ', e);
            res.status(500).send("Something went wrong!");
            return;
        }
    });
});
/** unmaintained  A/B testing code
exports.askGPT = functions.https.onRequest(async (req, res) => {
    cors(req, res, async () => {
        const prompt = req.body.data.prompt;
        const questionId = req.body.data.exercise;
        const classId = req.body.data.class;
        const group = req.body.data.group;
        if (!prompt) {
            res.status(422).json({ error: 'Uh oh, no prompt was provided' });
            return;
        } else if (!classId || !questionId || !group) {
            res.status(422).json({ error: 'Uh oh, your request is missing data. Try refreshing your browser!' });
            return;
        }
        const clientIP = req.headers['x-forwarded-for'] || req.headers['fastly-client-ip'] || req.socket?.remoteAddress;
        const userIp = clientIP || 0;
        const uid = req.body.data.user;

        const auth = admin.auth();
        const user = await auth.getUser(uid);
        if (!user) {
            res.status(422).json({ error: "Uh oh, login failed. Close this browser and open a new session" });
            return;
        }
        const userEmail = user.email;

        [testCases, stringifiedTestFunction, language, testType] = testCaseGenerator(classId, questionId); //because i need language

        chatGPTResult = await askOpenai(prompt, language);

        if (!chatGPTResult) {
            stderr = "Uh oh, ChatGPT is not working as expected. Your prompt might be triggering the limit! Try something else or try again later";
            return;
        }

        let stdout = '';
        let stderr = '';

        let timestamp = new Date();
        let attempt = {
            userIp: userIp,
            group: group,
            classId: classId,
            questionId: questionId,
            userEmail: userEmail,
            prompt: prompt,
            chatGPTresponse: chatGPTResult,
            stdout: stdout,
            stderr: stderr,
            type: 'withoutTest',
            created: timestamp.toISOString()
        };

        await getFirestore()
            .collection(classId.replace(/\s+/g, ''))
            .add(attempt);
        testStatus = stdout.includes('Test passed');
        if (stdout.includes('Test failed') || stderr != '') {
            testStatus = false;
        }
        if (chatGPTResult == '') {
            testStatus = false
            stderr = "ChatGPT did not return code（πーπ）"
        }
        res.send({
            "status": 201,
            "data": {
                userIp: userIp,
                chatGPTresponse: chatGPTResult,
                testStatus: testStatus,
                stderr: stderr,
                created: timestamp.toISOString()
            }
        });
        return;
    });
});

exports.testCode = functions.https.onRequest(async (req, res) => {
    cors(req, res, async () => {
        try {
            const prompt = req.body.data.prompt || '';
            const code = req.body.data.code;
            const questionId = req.body.data.exercise;
            const classId = req.body.data.class;
            const group = req.body.data.group;
            if (!code) {
                res.status(422).json({ error: 'Uh oh, no code was provided' });
                return;
            } else if (!classId || !questionId || !group) {
                res.status(422).json({ error: 'Uh oh, your request is missing data. Try refreshing your browser!' });
                return;
            }

            const clientIP = req.headers['x-forwarded-for'] || req.headers['fastly-client-ip'] || req.socket?.remoteAddress;
            const userIp = clientIP || 0;
            const uid = req.body.data.user;

            const auth = admin.auth();
            const user = await auth.getUser(uid);
            if (!user) {
                res.status(422).json({ error: "Uh oh, login failed. Close this browser and open a new session" });
                return;
            }
            const userEmail = user.email;
            let stringifiedTestFunction = '';
            let testCases = [];
            log('classId', classId);
            log('questionId', questionId);
            log('group', group);

            [testCases, stringifiedTestFunction, language, testType] = testCaseGenerator(classId, questionId);


            let chatGPTResult = code; //not asking chatgpt, code is sent from user

            let stdout = '';
            let stderr = '';
            let testResult = '';

            const resp = await testCode(chatGPTResult, language, testCases, stringifiedTestFunction);

            if (resp) {
                stdout = resp.stdout;
                stderr = resp.stderr;
                testResult = resp.testResult;
            } else {
                stderr = "Uh oh, Jobe is not working as expected. Your prompt might be triggering the limit! Try something else or try again later";
                return;
            }


            let timestamp = new Date();
            let attempt = {
                userIp: userIp,
                classId: classId,
                group: group,
                questionId: questionId,
                userEmail: userEmail,
                prompt: prompt,
                chatGPTresponse: chatGPTResult,
                stdout: stdout,
                stderr: stderr,
                testResult: testResult,
                type: 'withTest',
                created: timestamp.toISOString()
            };

            await getFirestore()
                .collection(classId.replace(/\s+/g, ''))
                .add(attempt);
            testStatus = stdout.includes('Test passed');
            if (stdout.includes('Test failed') || stderr != '') {
                testStatus = false;
            }
            if (chatGPTResult == '') {
                testStatus = false
                stderr = "ChatGPT did not return code（πーπ）"
            }
            // if (stderr.includes('implicit declaration of function')) {
            //     stderr = "The function name is not as specified in the question!"
            // }
            res.send({
                "status": 201,
                "data": {
                    userIp: userIp,
                    chatGPTresponse: chatGPTResult,
                    testStatus: testStatus,
                    stderr: stderr,
                    testResult: testResult,
                    created: timestamp.toISOString()
                }
            });
            return;
        } catch (e) {
            console.error('something went wrong, exception: ', e);
            res.status(500).send("Something went wrong!");
            return;
        }
    });
});

*/

