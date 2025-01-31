import * as React from 'react';
import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import ChatGPT from './ChatGPT';
import repeat from './visuals/repeat.png';
import initials from './visuals/initials.png';
import zeros from './visuals/zeros.png';
import tween from './visuals/tween.png';
import judge from './visuals/judge.png';
import scramble from './visuals/scramble.png';
import arrange from './visuals/arrange.png';
import speak from './visuals/speak.png';
import InputHello from './visuals/InputHello.gif';
import age from './visuals/age.gif';
import judgy from './visuals/judgy.gif';
import averageList from './visuals/averageList.png';
import sumEven from './visuals/sumEven.png';
import lastZero from './visuals/lastZero.png';
import simplifiedQueen from './visuals/simplifiedQueen.png';
import leafEater from './visuals/leafEater.png';
import fullQueen from './visuals/fullQueen.png';
import phoneBook from './visuals/phoneBook.png';
import keysInRange from './visuals/keysInRange.png';
import rubiks from './visuals/rubiks.png';
import salary from './visuals/salary.png';
import morse from './visuals/morse.png';
import pretest1 from './visuals/pre_test_prob_1.png';
import pretest2 from './visuals/pre_test_prob_2.png';
import pretest3 from './visuals/pre_test_prob_3.png';
import pretest4 from './visuals/pre_test_prob_4.png';
import pretest5 from './visuals/pre_test_prob_5.png';
import pretest6 from './visuals/pre_test_prob_6.png';
import posttest1 from './visuals/post_test_prob_1.png';
import posttest2 from './visuals/post_test_prob_2.png';
import posttest3 from './visuals/post_test_prob_3.png';
import posttest4 from './visuals/post_test_prob_4.png';
import posttest5 from './visuals/post_test_prob_5.png';
import posttest6 from './visuals/post_test_prob_6.png';
import practest1 from './visuals/practice_prob_1.png';
import practest2 from './visuals/practice_prob_2.png';
import practest3 from './visuals/practice_prob_3.png';
import practest4 from './visuals/practice_prob_4.png';
import practest5 from './visuals/practice_prob_5.png';



import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { useTranslation } from 'react-i18next';
import { LinearProgress } from '@mui/material';

const languages = [
    { code: 'en', name: 'English' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ar', name: 'Arabic' },
    // Add more languages as needed
];

export default function ExerciseStepper({ currUser, group }) {
    const { i18n } = useTranslation();
    const { t } = useTranslation();
    const [activeStep, setActiveStep] = React.useState(0);
    const [currClass, setcurrClass] = React.useState(null);
    const [error, setError] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [completedSteps, setCompletedSteps] = React.useState([false, false, false]);
    let codingLanguage = 'Python'
    let steps = [t("Class Registration"), t("Exercise #1"), t("Exercise #2"), t("Exercise #3")];
    //let options = ['ACU CS 120 (Programming 1)', 'COMPSCI 747', 'Java']
    let options = ['Practice Problems: Pilot Class - Intro to Coding', 'Prettest: Pilot Class - Intro to Coding', 'Posttest: Pilot Class - Intro to Coding'];// 'COMPSCI 101 Lab 10', 'COMPSCI 101 Lab 11', 'COMPSCI 101 Lab 12'];
    const [selectedLanguage, setSelectedLanguage] = React.useState({ code: 'en', name: 'English' });
    if (window.location.href.includes('sigcse')) {
        options = [
            'Intro Python Functions Part 1',
            'Intro Python Functions Part 2',
            'Intro Python Dictionary +',
            'Intro Python Scripting',
            'Intro C - simple',
            'Intro C - advanced'
        ]
    }
    if (currClass == '#2: PA2 (Programação e Algoritmos 2 - Programming and Algorithms 2)'
        || currClass == 'Intro Python Dictionary +'
        || currClass == 'Practice Problems: Pilot Class - Intro to Coding'
    ) {
        steps = [t("Class Registration"), t("Exercise #1"), t("Exercise #2"), t("Exercise #3"), t("Exercise #4"), t("Exercise #5")];
        // setCompletedSteps([false, false, false, false, false]);

    }

    if (currClass === 'Prettest: Pilot Class - Intro to Coding'
        || currClass === 'Posttest: Pilot Class - Intro to Coding'
    ) {
        steps = [t("Class Registration"), t("Exercise #1"), t("Exercise #2"), t("Exercise #3"), t("Exercise #4"), t("Exercise #5"), t("Exercise #6")];

        // setCompletedSteps([false, false, false, false, false, false]);
        // console.log('fml', completedSteps);

    }

    if (currClass == 'COMPSCI 747') {
        steps = [t("Class Registration"), t("Exercise #1"), t("Exercise #2"), t("Exercise #3"), t("Exercise #4"), t("Exercise #5"), "Exercise #6", "Exercise #7", "Exercise #8"];

    }

        function Download() {
            const [error, setError] = React.useState();
            const [loading, setLoading] = React.useState(false);
            const handleDownload = async () => {
                setLoading(true);
                try {
                    const functions = getFunctions(getApp());
                    const callableReturnMessage = httpsCallable(functions, 'downloadDataAsJson');

                    console.log(currUser);
                    callableReturnMessage({ user: currUser.uid, class: currClass })
                        .then((response) => {
                            const data = response;
                            const json = JSON.stringify(data);
                            const blob = new Blob([json], { type: 'application/json' });
                            const timestamp = new Date().toISOString();
                            const nospaceclass = currClass.replace(/\s+/g, '');
                            const filename = `${nospaceclass}-${timestamp}.json`;
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = filename;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
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
                }
            };
            const handleSuccessDownload = async () => {
                setLoading(true);
                try {
                    const functions = getFunctions(getApp());
                    const callableReturnMessage = httpsCallable(functions, 'downloadSuccessAsJson');

                    console.log(currUser);
                    callableReturnMessage({ user: currUser.uid, class: currClass })
                        .then((response) => {
                            const data = response;
                            const json = JSON.stringify(data);
                            const blob = new Blob([json], { type: 'application/json' });
                            const timestamp = new Date().toISOString();
                            const nospaceclass = currClass.replace(/\s+/g, '');
                            const filename = `${nospaceclass}-${timestamp}.json`;
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = filename;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
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
                }
            };
            const exclusivity = ['thezyrie@gmail.com', 'paul.denny@gmail.com', 'messionyk@gmail.com'];
            if (exclusivity.includes(currUser.email)) {
                return (<React.Fragment>
                    <div>
                        {!error && !loading && <Button loading={loading} onClick={handleDownload}>Download JSON</Button>}
                        {!error && loading && <p>Fetching data, please wait</p>}
                        {!error && !loading && <Button loading={loading} onClick={handleSuccessDownload}>Download Success Record</Button>}
                        {error && <p>Something went wrong while fetching the data, please try again later</p>}
                    </div>
                </React.Fragment>
                );
            }

        };

        function Exercise() {
            const [passed, setPassed] = React.useState(false);

            let file = null;
            let animation = null;

            if (currClass == 'Prettest: Pilot Class - Intro to Coding') {
                if (activeStep === 1) {
                    file = pretest1;
                } else if (activeStep === 2) {
                    file = pretest2;
                } else if (activeStep === 3) {
                    file = pretest3;
                } else if (activeStep === 4) {
                    file = pretest4;
                } else if (activeStep === 5) {
                    file = pretest5;
                } else if (activeStep === 6) {
                    file = pretest6;
                }
            }

            if (currClass == 'Posttest: Pilot Class - Intro to Coding') {
                if (activeStep === 1) {
                    file = posttest1;
                } else if (activeStep === 2) {
                    file = posttest2;
                } else if (activeStep === 3) {
                    file = posttest3;
                } else if (activeStep === 4) {
                    file = posttest4;
                } else if (activeStep === 5) {
                    file = posttest5;
                } else if (activeStep === 6) {
                    file = posttest6;
                }
            }

        if (currClass == 'Practice Problems: Pilot Class - Intro to Coding') {
                if (activeStep === 5) {
                    file = practest1;
                } else if (activeStep === 1) {
                    file = practest2;
                } else if (activeStep === 2) {
                    file = practest3;
                } else if (activeStep === 3) {
                    file = practest4;
                } else if (activeStep === 4) {
                    file = practest5;
                }
            }
            if (currClass == 'COMPSCI 101 Lab 12') {
                if (activeStep === 1) {
                    file = rubiks;
                } else if (activeStep === 2) {
                    file = morse;
                } else if (activeStep === 3) {
                    file = salary;
                }
            }

        if (currClass == 'ACU CS 120 (Programming 1)' || currClass == 'COMPSCI 101 Lab 11') {
                if (activeStep === 1) {
                    file = scramble;
                } else if (activeStep === 2) {
                    file = arrange;
                } else if (activeStep === 3) {
                    file = speak;
                }
            }

            if (currClass == 'Java') {
                codingLanguage = 'Java'
                if (activeStep === 1) {
                    file = scramble;
                } else if (activeStep === 2) {
                    file = arrange;
                } else if (activeStep === 3) {
                    file = speak;
                }
            }

            if (currClass == '#2: PA2 (Programação e Algoritmos 2 - Programming and Algorithms 2)'
                || currClass == 'Intro Python Dictionary +'
            ) {
                if (activeStep === 4) {
                    file = keysInRange;
                } else if (activeStep === 5) {
                    file = phoneBook;
                } else if (activeStep === 1) {
                    file = scramble;
                } else if (activeStep === 2) {
                    file = arrange;
                } else if (activeStep === 3) {
                    file = speak;
                }
            }
            if (currClass == 'PA2 (Programação e Algoritmos 2 - Programming and Algorithms 2)') {
                if (activeStep === 1) {
                    file = zeros;
                } else if (activeStep === 2) {
                    file = initials;
                } else if (activeStep === 3) {
                    file = repeat;
                }
            }
            if (currClass == 'COMPSCI101' || currClass == 'Intro Python Scripting') {
                if (activeStep === 1) {
                    animation = InputHello;
                } else if (activeStep === 2) {
                    animation = age;
                    file = tween;
                } else if (activeStep === 3) {
                    animation = judgy;
                    file = judge;
                }
            }
            if (currClass == 'COMPSCI130 - Lab 11' || currClass == 'Intro Python Functions Part 2') {
                if (activeStep === 1) {
                    file = scramble;
                } else if (activeStep === 2) {
                    file = arrange;
                } else if (activeStep === 3) {
                    file = speak;
                }
            }
            if (currClass == 'COMPSCI 747') {
                if (activeStep === 1) {
                    file = zeros;
                } else if (activeStep === 2) {
                    file = initials;
                } else if (activeStep === 3) {
                    file = repeat;
                } else if (activeStep === 7) {
                    file = keysInRange;
                } else if (activeStep === 8) {
                    file = phoneBook;
                } else if (activeStep === 4) {
                    file = scramble;
                } else if (activeStep === 5) {
                    file = arrange;
                } else if (activeStep === 6) {
                    file = speak;
                }
            }

            if (currClass == 'COMPSCI130 - Lab 10'
                || currClass == 'Intro Python Functions Part 1' || currClass == 'COMPSCI 101 Lab 10') {
                if (activeStep === 1) {
                    file = zeros;
                } else if (activeStep === 2) {
                    file = initials;
                } else if (activeStep === 3) {
                    file = repeat;
                }
            }
            if (currClass == 'ENGGEN 131 - LAB 9' || currClass == 'Intro C - simple') {
                codingLanguage = 'C'
                if (activeStep === 1) {
                    file = averageList;
                } else if (activeStep === 2) {
                    file = sumEven;
                } else if (activeStep === 3) {
                    file = lastZero;
                }
            }
            if (currClass == 'ENGGEN 131 - LAB 12' || currClass == 'Intro C - advanced') {
                codingLanguage = 'C'
                if (activeStep === 3) {
                    file = leafEater;
                } else if (activeStep === 1) {
                    file = simplifiedQueen;
                } else if (activeStep === 2) {
                    file = fullQueen;
                }
            }
            if (activeStep === 0) {
                return (<React.Fragment>
                    <Typography sx={{ mt: 2, mb: 1 }}>
                        Please select below the class you are currently enrolled in!
                    </Typography>
                    <Autocomplete
                        value={currClass}
                        onChange={(event, newValue) => {
                            setcurrClass(newValue);
                        }}
                        options={options}
                        sx={{ width: 300 }}
                        renderInput={(params) => <TextField {...params} label="Select class code" />}
                    />
                    <Typography sx={{ mt: 2, mb: 1 }}>
                        Please select language:
                    </Typography>
                    <Autocomplete
                        options={languages}
                        getOptionLabel={(option) => option.name}
                        value={selectedLanguage}
                        sx={{ width: 300 }}
                        onChange={handleLanguageChange}
                        renderInput={(params) => <TextField {...params} label="Select Language" />}
                    />
                    <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
                        <Button onClick={handleNext} disabled={!currClass} >
                            {'Enter'}
                        </Button>
                    </Box>
                </React.Fragment>
                );
            } else {
                return (<React.Fragment>
                    <Download currClass={currClass} currUser={currUser} />
                    <Typography sx={{ mt: 2, mb: 1 }} dir={selectedLanguage.code === 'ar' ? 'rtl' : 'ltr'}>{t("View the problem")}</Typography>
                    <img style={{ margin: "20px", direction: selectedLanguage.code === 'ar' ? 'rtl' : 'ltr', ...(selectedLanguage.code === 'ar' && { float: "right" }) }} src={animation} />
                    <img style={{ margin: "20px", direction: selectedLanguage.code === 'ar' ? 'rtl' : 'ltr', ...(selectedLanguage.code === 'ar' && { float: "right" }) }} src={file} />
                    <ChatGPT exercise={activeStep} currUser={currUser} setPassed={setPassed} currClass={currClass} group={group} language={selectedLanguage} />
                    <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
                        <Button
                            color="inherit"
                            disabled={activeStep === 0}
                            onClick={handleBack}
                            sx={{ mr: 1 }}
                        >
                            {t('Back')}
                        </Button>

                        <Button onClick={handleNext} disabled={!passed} >
                            {activeStep === steps.length - 1 ? t('Finish') : t('Next')}
                        </Button>
                    </Box>
                </React.Fragment>
                );
            }
        };

        const handleNext = () => {
            if (activeStep == 0) {
                setLoading(true);
                try {
                    const functions = getFunctions(getApp());
                    const callableReturnMessage = httpsCallable(functions, 'userState');

                    callableReturnMessage({ user: currUser.uid, class: currClass })
                        .then((result) => {
                            const newCompletedSteps = [...completedSteps];
                            for (let i = 0; i < result.data.documents.length; i++) {
                                console.log(result.data.documents[i].questionId, 'result.data.documents[i].questionId ');
                                newCompletedSteps[result.data.documents[i].questionId - 1] = true;
                            }
                            setCompletedSteps(newCompletedSteps);
                            console.log(completedSteps);
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
                }
            } else {
                const newCompletedSteps = [...completedSteps];
                newCompletedSteps[activeStep - 1] = true;
                setCompletedSteps(newCompletedSteps);
            }
            setActiveStep((prevActiveStep) => prevActiveStep + 1);
        };

        const handleBack = () => {
            setActiveStep((prevActiveStep) => prevActiveStep - 1);
        };

        const handleReset = () => {
            setActiveStep(0);
        };

        const handleLanguageChange = (event, value) => {
            if (value) {
                i18n.changeLanguage(value.code);
                setSelectedLanguage(value);
            }
        };

        return (
            <div>
                <div style={{ maxWidth: '900px', textAlign: 'center', justifyContent: 'center', margin: '20px', display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
                    <p style={{ margin: "20px", direction: selectedLanguage.code === 'ar' ? 'rtl' : 'ltr' }}>
                        {t("FirstBlurb")}
                    </p>
                    <p style={{ margin: "20px", direction: selectedLanguage.code === 'ar' ? 'rtl' : 'ltr' }}>
                        {t("SecondBlurb", { language: codingLanguage })}
                    </p>
                    <p style={{ margin: "20px", direction: selectedLanguage.code === 'ar' ? 'rtl' : 'ltr' }}>
                        {t('ThirdBlurb', { language: codingLanguage })}
                    </p>
                </div>
                <Box sx={{ width: '900px', margin: '20px' }}>
                    <Stepper activeStep={activeStep} direction={selectedLanguage.code === 'ar' ? 'rtl' : 'ltr'}>
                        {steps.map((label, index) => {
                            const stepProps = {};
                            const labelProps = {};
                            return (
                                <Step key={label} {...stepProps}>
                                    <StepLabel {...labelProps}>{label}</StepLabel>
                                </Step>
                            );
                        })}
                    </Stepper>
                    {activeStep === steps.length ? (
                        <React.Fragment>
                            <Typography sx={{ mt: 2, mb: 1 }}>
                                All steps are completed - you are finished. Thank you for using Promptly!
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
                                <Box sx={{ flex: '1 1 auto' }} />
                                <Button onClick={handleReset}>Reset</Button>
                            </Box>
                        </React.Fragment>
                    ) : (<Exercise exercise={activeStep} currUser={currUser} group={group} />)}
                </Box>
            </div >
        );
    }