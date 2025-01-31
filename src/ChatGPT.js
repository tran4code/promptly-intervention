import React, { useState } from 'react';
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import python from 'react-syntax-highlighter/dist/esm/languages/hljs/python';
import c from 'react-syntax-highlighter/dist/esm/languages/hljs/c';
import java from 'react-syntax-highlighter/dist/esm/languages/hljs/java';
import { atomOneLight } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import TextField from '@mui/material/TextField';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-c_cpp'; // Set the mode for C/C++ code
import 'ace-builds/src-noconflict/theme-monokai'; // Choose the desired theme
import CheckIcon from '@mui/icons-material/CheckCircle';
import ClearIcon from '@mui/icons-material/HighlightOff';
import { ErrorBoundary } from 'react-error-boundary';
import { Translation, useTranslation } from 'react-i18next';
import { List, ListItem, ListItemIcon, ListItemText, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, Typography} from '@mui/material';
import Confetti from 'react-confetti';
import StarIcon from '@mui/icons-material/Star';

export default function ChatGPT({ exercise, currUser, setPassed, currClass, group, language }) {
	const { t } = useTranslation();
	let codingLanguage = 'python'
	let defaultValue = t('PythonPrompt');
	SyntaxHighlighter.registerLanguage('python', python);
	if(currClass) {
		if (currClass.includes('Intro C')) {
			SyntaxHighlighter.registerLanguage('c', c);
			codingLanguage = 'c'
			defaultValue = t('CPrompt');
		} else if (currClass.includes('Scripting')) {
			defaultValue = t('PythonPromptScripting');
		} else if (currClass.includes('Java')) {
			codingLanguage = 'java'
			SyntaxHighlighter.registerLanguage('java', java);
			defaultValue = t('JavaPrompt');
		} else if (currClass.includes('Pilot')) {
			defaultValue = t('PythonPrompt') + "is called mystery_func and ";
		}
	}
	const [prompt, setPrompt] = useState("");
	const [apiResponse, setApiResponse] = useState("");
	const [score, setScore] = useState({ robustness: null, topRobustness: null, verbosity: null, topVerbosity: null });
	const [codeRunningResponse, setCodeRunningResponse] = useState("");
	const [error, setError] = useState(t("Something went wrong. Refresh your page and try again."));
	const [testCases, setTestCases] = useState([]);
	const [loading, setLoading] = useState(false);
	const [testing, setTesting] = useState(false);
	const [winOpen, setWinOpen] = useState(false);
	const [wordCount, setWordCount] = useState(0);

	const WinNotification = ({ open, onClose }) => {
		let numStars = 0;
		let robustnessText = ''
		if (score.robustness >= 66) {
			robustnessText = t('Your prompt is very robust! Perfect Score')
			numStars = 3;
		} else if (score.robustness >= 33) {
			robustnessText = t('Your prompt is robust but fails on repeated attempts.')
			numStars = 2;
		} else {
			robustnessText = t('Your prompt is not very robust.')
			numStars = 1;
		}
		const stars = [];
		for (let i = 0; i < numStars; i++) {
			stars.push(<StarIcon key={i} sx={{
				color: '#ebcc34',
				backgroundImage: 'linear-gradient(to bottom right, #f9f16d, #f5e3a8)',
				borderRadius: '50%',
				padding: '4px',
				boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
				fontSize: '50px',
				margin: '8px'
			}} />);
		}
		for (let i = 0; i < 3 - numStars; i++) {
			stars.push(<StarIcon key={i} sx={{
				color: '#cad0db',
				backgroundImage: 'linear-gradient(to bottom right, #f9f16d, #f5e3a8)',
				borderRadius: '50%',
				padding: '4px',
				boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
				fontSize: '50px',
				margin: '8px'
			}} />);
		}
		return (
			<Dialog open={open} onClose={onClose} style={{ width: '80%', maxWidth: 'none' }} >
				<DialogTitle sx={{
					alignSelf: 'center',
				}} >{t('You Pass!')}</DialogTitle>
				<DialogContent>
					<DialogContentText>
						{t("RobustnessExplanation")}
					</DialogContentText>
					<div style={{
						marginTop: '10px',
						textAlign: 'center',
					}}>
						{stars.map((star, index) => (
							<span key={index}>{star}</span>
						))}
					</div>
					<DialogContentText>
						{robustnessText}
					</DialogContentText>

					<div style={{
						marginTop: '30px',
					}}>
						{t('Your word count: ') + score.verbosity}

					</div>
					<div>
						{t('Lowest word count ever: ') + score.topVerbosity}

					</div>
					<Confetti />
				</DialogContent>
				<DialogActions>
					<Button onClick={onClose} color="primary">
						Close
					</Button>
				</DialogActions>
			</Dialog>
		);
	};

	const handleWinClose = () => {
		setWinOpen(false);
	};

	const handleChangeCode = (newCode) => {
		setApiResponse(newCode);
	};

	const handleSubmit = async () => {
		setLoading(true);
		try {
			const functions = getFunctions(getApp());
			const callableReturnMessage = httpsCallable(functions, 'tryPrompt');

			callableReturnMessage({ prompt: prompt, exercise: exercise, user: currUser.uid, class: currClass, group: group, promptLanguage: language }) //i dont want to deal with !0
				.then((result) => {
					setApiResponse(result.data.chatGPTresponse);
					if (result.data.stderr) {
						setCodeRunningResponse(result.data.stderr);
					} else if (result.data.testStatus && !result.data.stderr) {
						setCodeRunningResponse(t("You pass!") + " ＼( ^o^ )／ ");
						setPassed(true);
					}
					if (result.data.robustness) {
						setWinOpen(true);
						setScore({ robustness: result.data.robustness, topRobustness: result.data.topRobustness, verbosity: result.data.verbosity, topVerbosity: result.data.topVerbosity })
					}
					setTestCases(result.data.testResult.split(''));

				})
				.catch((error) => {
					console.log(error);
					setError(error);
				})
				.finally(() => {
					setLoading(false);
				});
		} catch (e) {
			console.log(e);
			setLoading(false);
			setApiResponse(t('Something went wrong! We will look into it, try again at a later time'));
		}
	};

	const handleGPTSubmit = async () => {
		setLoading(true);
		try {
			const functions = getFunctions(getApp());
			const callableReturnMessage = httpsCallable(functions, 'askGPT');

			callableReturnMessage({ prompt: prompt, exercise: exercise, user: currUser.uid, class: currClass, group: group }) //i dont want to deal with !0
				.then((result) => {
					setApiResponse(result.data.chatGPTresponse);
				})
				.catch((error) => {
					console.log(error);
					setError(error);
				})
				.finally(() => {
					setLoading(false);
				});
		} catch (e) {
			console.log(e);
			setLoading(false);
			setApiResponse(t('Something went wrong! We will look into it, try again at a later time'));
		}
	};

	const handleCodeSubmit = async () => {
		setTesting(true);
		setTestCases([]);
		setCodeRunningResponse("");
		try {
			const functions = getFunctions(getApp());
			const callableReturnMessage = httpsCallable(functions, 'testCode');

			callableReturnMessage({ prompt: prompt, code: apiResponse, exercise: exercise, user: currUser.uid, class: currClass, group: group })
				.then((result) => {
					setApiResponse(result.data.chatGPTresponse);
					if (result.data.stderr) {
						setCodeRunningResponse(result.data.stderr);
					} else if (result.data.testStatus && !result.data.stderr) {
						setCodeRunningResponse(t("You pass ＼( ^o^ )／ !"));
						setPassed(true);
					}
					setTestCases(result.data.testResult.split(''));
				})
				.catch((error) => {
					console.log(error);
					setError(error);
				})
				.finally(() => {
					setTesting(false);
				});
		} catch (e) {
			console.log(e);
			setTesting(false);
			setApiResponse(t('Something went wrong! We will look into it, try again at a later time'));
		}
	};

	const promptChange = (event) => {
		const inputText = event.target.value;
		setPrompt(inputText);

		const words = inputText.trim().split(/\s+/);
		setWordCount(words[0] === '' ? 0 : words.length);
	};


	const codeBlockStyles = {
		fontFamily: 'Monospace', // Use a monospace font for code
		padding: '8px',
		backgroundColor: '#f5f5f5', // Set a background color
		borderRadius: '4px',
		border: '1px solid #ccc', // Add a border
		cursor: 'text', // Make it look clickable/editable
	};

	if (group == 1) {
		return (
			<ErrorBoundary fallback={<div>{error}</div>}>
				<WinNotification open={winOpen} onClose={handleWinClose} />
				<div style={{

					display: 'inline'
				}}>
					<form onSubmit={handleSubmit}>
						<TextField
							multiline
							fullWidth
							margin="normal"
							defaultValue={defaultValue}
							helperText={t("Write your ChatGPT prompt here")}
							onChange={promptChange}
							style={{ direction: language.code === 'ar' ? 'rtl' : 'ltr' }}
						></TextField>
						<Typography variant="body2" color="textSecondary" align="right">
							{t("Word Count: ")} {wordCount}
						</Typography>
						<br />

						<Button style={{ direction: language.code == 'ar' ? 'rtl' : 'ltr', float: language.code == 'ar' ? 'right' : 'left' }} variant="contained" disabled={loading || prompt.length === 0} onClick={() => {
							handleSubmit();
						}}>
							{loading ? t('Asking...') : t("Click here to ask ChatGPT!")}
						</Button>
					</form>
					<br />
					<br />
					<div style={{ display: "inline-flex", marginTop: '20px', marginBottom: '20px', float: language.code === 'ar' ? 'right' : 'left' }}>
						<strong
							style={{
								marginTop: '20px',
								direction: language.code === 'ar' ? 'rtl' : 'ltr',
								float: language.code === 'ar' ? 'right' : 'left'
							}}
						>
							<h1>{t('ChatGPT response:')}</h1>
						</strong>
					</div>
					<br />
					<br />
					<br />
					<div style={{ clear: "left" }}>
						<SyntaxHighlighter language={codingLanguage} style={atomOneLight}>
							{apiResponse}
						</SyntaxHighlighter>
					</div>
					<br />
					<div>
						<List>
							{testCases.map((result, index) => (
								<ListItem key={index}>
									<ListItemIcon>
										{result === '1' ? (
											<CheckIcon style={{ color: 'green' }} />
										) : (
											<ClearIcon style={{ color: 'red' }} />
										)}
									</ListItemIcon>
									<ListItemText primary={`Test ${index + 1}`} />
								</ListItem>
							))}
						</List>
					</div>
					<br />
					<div>
						<strong
							style={{
								display: "flex",
								direction: language.code === 'ar' ? 'rtl' : 'ltr'
							}}
						>
							{t('Code Running response:')}
						</strong>
						<br />
						<pre>
							{codeRunningResponse}
						</pre>
					</div>
				</div>
			</ErrorBoundary >

		);

	}
	/** A/B TESTING Unmaintained code below
	 * else if (false) { //group 2 edits the code returned
		return (
			<ErrorBoundary fallback={<div>{error}</div>}>
				<div style={{
					margin: '30px',
				}}>
					<form onSubmit={handleSubmit}>
						<TextField
							multiline
							fullWidth
							margin="normal"
							defaultValue={defaultValue}
							helperText="Write your ChatGPT prompt here"
							onChange={(e) => setPrompt(e.target.value)}
						></TextField>
						<br />
						<Button variant="contained" disabled={loading || prompt.length === 0} onClick={() => {
							handleGPTSubmit();
						}}>
							{loading ? "Asking..." : "Click here to ask ChatGPT!"}
						</Button>
					</form>
					<br />
					<div>
						<strong
							style={{
								display: "flex",
								marginBottom: "20px"
							}}
						>
							ChatGPT response:
						</strong>

						<AceEditor
							mode="c_cpp" // Set the mode for C/C++ code
							theme="monokai" // Set the desired theme
							value={apiResponse}
							onChange={handleChangeCode}
							name="c-code-editor"
							editorProps={{ $blockScrolling: true }}
							height="300px" // Set the desired height
							width="100%" // Set the desired width
						/>
						<Button
							style={{
								marginTop: "20px"
							}}
							variant="contained"
							disabled={testing || apiResponse.length === 0}
							onClick={() => {
								handleCodeSubmit();
							}}
						>
							{testing ? "Testing..." : "Click here to Test your code!"}
						</Button>
					</div>
					<br />
					<div>
						<List>
							{testCases.map((result, index) => (
								<ListItem key={index}>
									<ListItemIcon>
										{result === '1' ? (
											<CheckIcon style={{ color: 'green' }} />
										) : (
											<ClearIcon style={{ color: 'red' }} />
										)}
									</ListItemIcon>
									<ListItemText primary={`Test ${index + 1}`} />
								</ListItem>
							))}
						</List>
					</div>
					<br />
					<div>
						<strong
							style={{
								display: "flex"
							}}
						>
							Code Running response:
						</strong>
						<br />
						<pre>
							{codeRunningResponse}
						</pre>
					</div>
				</div>
			</ErrorBoundary>
		);
	} */

}
