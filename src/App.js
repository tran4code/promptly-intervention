
import ExerciseStepper from './Stepper';
import * as React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import useMediaQuery from '@mui/material/useMediaQuery';
import { auth, googleProvider } from "./utils/firebase";
import { signInWithPopup, signOut } from "firebase/auth";
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { SHA256 } from 'crypto-js';
import { Translation, useTranslation } from 'react-i18next';

function App() {
	const { t } = useTranslation();
	const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
	const [currUser, setUser] = React.useState(null);
	const signInWithGoogle = async () => {
		signInWithPopup(auth, googleProvider)
			.then((result) => {
				// The signed-in user info.
				setUser(result.user);
				console.log(result.user);
			}).catch((error) => {
				console.log(error);
			});
	};
	const logOut = async () => {
		signOut(auth).then(() => {
			setUser(null);
		}).catch((error) => {
			console.log(error);
		});

	};

	const theme = React.useMemo(
		() =>
			createTheme({
				palette: {
					mode: prefersDarkMode ? 'dark' : 'light',
				},
			}),
		[prefersDarkMode],
	);


	let show;
	if (currUser) {
		let group = 1;

		// A/B TESTING BY EMAIL
		// let hash = SHA256(currUser.email.split('@')[0]).toString();
		// if (parseInt(hash.charAt(0), 16) % 2 === 0) {
		// 	group = 2; //CAN EDIT
		// } else {
		// 	group = 1;
		// }

		show = <div sx={{ mt: 5, mb: 1 }} >
			<ExerciseStepper currUser={currUser} group={group} />
		</div>;
	} else {
		show = <div>
			<Button sx={{ mt: 5, mb: 1 }} onClick={signInWithGoogle}>
				{t('Please sign in with your Gmail Account')}
			</Button>
		</div>;
	}

	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			<header>
				<Container maxWidth="md">
					<div style={{ justifyContent: 'center', margin: '20px', display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
						<Typography sx={{ mt: 2, mb: 2 }} variant="h4">Welcome to Promptly!</Typography>
						{currUser && <Button sx={{ mt: 5, mb: 1 }} onClick={logOut}>{t('Click here to Log Out!')}</Button>}
					</div>
				</Container>
			</header>
			<main>
				<div style={{ justifyContent: 'center', display: 'flex' }}>
					{show}
				</div>
			</main>
		</ThemeProvider>
	)
}

export default App;
