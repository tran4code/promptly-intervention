import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      "ChatGPT response:": "ChatGPT response:",
      "PythonPrompt": "Write me a Python function that ",
      "PythonPromptScripting": "Write me a Python script that ",
      "CPrompt": "Write me a C function called ",
      "JavaPrompt": "Write me a Java function called ",
      "Asking...": "Asking...",
      "Something went wrong. Refresh your page and try again.": "Something went wrong. Refresh your page and try again.",
      "Something went wrong! We will look into it, try again at a later time": "Something went wrong! We will look into it, try again at a later time",
      "You pass!": "You pass!",
      "Write your ChatGPT prompt here": "Write your ChatGPT prompt here",
      "Click here to ask ChatGPT!": "Click here to ask ChatGPT!",
      "Code Running response:": "Code Running response:",
      "View the problem": "View the problem",
      "FirstBlurb": "The purpose of this activity is to give you some hands-on experience generating prompts for large language models (e.g. ChatGPT).  As these tools are used in industry, it is useful to learn how to interact with these models in a productive way.  A very useful skill is to learn how to create prompts that generate code to solve the problem you are working on.",
      "SecondBlurb": `You may find it useful for your learning to see alternative approaches to solving problems, and to enhance your knowledge of {{language}}.`,
      'ThirdBlurb': 'Your task is to view the visual shown in "View the problem" and then type a prompt which describes the task sufficiently well for the language model to generate a correct solution in {{language}}.  If the code that is generated is not correct, you will see test output below the coding area and you can try again by modifying the prompt!',
      "RobustnessExplanation": "We tested the robustness of your score by running your prompt through chatGPT multiple time and checking if it consistently produces correct code.",
      "Your word count: ": "Your word count: ",
      "Lowest word count: ": "Lowest word count: ",
      "Your prompt is very robust! Perfect Score": "Your prompt is very robust! Perfect Score",
      "Your prompt is robust but fails on repeated attempts.": "Your prompt is robust but fails on repeated attempts.",
      "Your prompt is not very robust.": "Your prompt is not very robust.",
      "Back": "Back",
      "Finish": "Finish",
      "Next": "Next",
      'Please select language:': 'Please select language:',
      'Please select below the class you are currently enrolled in!': 'Please select below the class you are currently enrolled in!',
      "Exercise #1": "Exercise #1",
      "Exercise #2": "Exercise #2",
      "Exercise #3": "Exercise #3",
      "Exercise #4": "Exercise #4",
      "Exercise #5": "Exercise #5",
      "Class Registration": "Class Registration"
    }
  },
  pt: {
    translation: {
      "ChatGPT response:": "Resposta do ChatGPT:",
      "PythonPrompt": "Escreva-me uma função Python com o nome ",
      "PythonPromptScripting": "Escreva-me um script Python que",
      "CPrompt": "Escreva-me uma função C com o nome ",
      "JavaPrompt": "Escreva-me uma função Java com o nome ",
      "Asking...": "Pergunto...",
      "Something went wrong. Refresh your page and try again.": "Algo correu mal. Actualize a sua página e tente novamente.",
      "Something went wrong! We will look into it, try again at a later time": "Algo correu mal! Vamos analisar o problema, tente novamente, mais tarde",
      "You pass!": "Passou!",
      "Write your ChatGPT prompt here": "Escreva aqui a sua pergunta para o ChatGPT",
      "Click here to ask ChatGPT!": "Clique aqui para perguntar ao ChatGPT!",
      "Code Running response:": "Resultado da execução do código",
      "View the problem": "Ver o problema",
      "FirstBlurb": "O objetivo desta atividade é proporcionar-lhe alguma experiência prática na criação de prompts para os grandes modelos de linguagem (por exemplo, ChatGPT).  Como estas ferramentas são utilizadas na indústria, é útil aprender a interagir com estes modelos de uma forma produtiva.  Uma competência muito útil é aprender a criar prompts que geram código para resolver o problema em que se está a trabalhar.",
      "SecondBlurb": "Pode ser útil para a sua aprendizagem, vendo abordagens alternativas para resolver problemas e para melhorar os seus conhecimentos de {{language}}.",
      'ThirdBlurb': "A sua tarefa consiste em ver a imagem apresentada em 'Ver o problema' e, de seguida, escrever uma mensagem que descreva a tarefa suficientemente bem para que o grande modelo de linguagem gere uma solução correcta em {{language}}.  Se o código gerado não estiver correto, verá o resultado do teste por baixo da área de codificação e pode tentar novamente modificando a pergunta!",
      "RobustnessExplanation": "We tested the robustness of your score by running your prompt through chatGPT multiple time and checking if it consistently produces correct code.",
      "Your word count: ": "Your word count: ",
      "Lowest word count: ": "Lowest word count: ",
      "Your prompt is very robust! Perfect Score": "Your prompt is very robust! Perfect Score",
      "Your prompt is robust but fails on repeated attempts.": "Your prompt is robust but fails on repeated attempts.",
      "Your prompt is not very robust.": "Your prompt is not very robust.",
      "Back": "Back",
      "Finish": "Finish",
      "Next": "Next",
      'Please select language:': 'Please select language:',
      'Please select below the class you are currently enrolled in!': 'Please select below the class you are currently enrolled in!',
      "Exercise #1": "Exercise #1",
      "Exercise #2": "Exercise #2",
      "Exercise #3": "Exercise #3",
      "Exercise #4": "Exercise #4",
      "Exercise #5": "Exercise #5",
      "Class Registration": "Class Registration"
    }
  },
  ar: {
    translation: {
      "ChatGPT response:": "رد شات جي بي تي",
      "PythonPrompt": "اكتب لي دالة بلغة بايثون تقوم ",
      "CPrompt": "اكتب لي دالة بلغة سي تقوم ",
      "PythonPromptScripting": "Write me a Python script that ",
      "JavaPrompt": "اكتب لي دالة بلغة جافا تقوم ",
      "Asking...": "يسأل...",
      "Something went wrong. Refresh your page and try again.": "حدث خطأ. قم بتحديث الصفحة وحاول مرة أخرى.",
      "Something went wrong! We will look into it, try again at a later time": "حدث خطأ! سنرى ماهي المشكلة التي حدثت، جرّب مرة أخرى في وقت لاحق.",
      "You pass!": "!تم الاجتياز",
      "Write your ChatGPT prompt here": "اكتب سؤالك لشات جي بي تي هنا",
      "Click here to ask ChatGPT!": "إضغط هنا لسؤال شات جي بي تي",
      "Code Running response:": "نتيجة تشغيل الكود",
      "View the problem": "عرض المشكلة",
      "FirstBlurb": "الغرض من هذا النشاط هو تزويدك ببعض الخبرة العملية في إنشاء الأسئلة لنماذج اللغة الكبيرة (مثل شات جي بي تي). نظرًا لأن هذه الأدوات تستخدم في سوق العمل، فمن المفيد تعلم كيفية التفاعل مع هذه النماذج بطريقة إنتاجية. إحدى المهارات المفيدة جدًا هي تعلم كيفية إنشاء الأسئلة لتوليد الأكواد لحل المشكلة التي تعمل عليها.",
      "SecondBlurb": "قد تكون من الفائدة بالنسبة لك ولعملية تعلمك أن تطّلع على أساليب بديلة لحل المشكلات، وتعزيز معرفتك بلغة بايثون.",
      'ThirdBlurb': "مهمتك هي ان تشاهد الرسم المعروض في 'عرض المشكلة'، ثم كتابة وصف او سؤال يصف المهمة او المشكلة التي في الرسم بما يكفي لنموذج اللغة حتى يستطيع أن يولد حلاً صحيحاً بلغة البايثون. إذا كان الكود الذي تم إنشاؤه ليس صحيحًا، فسترى نتائج اختبار الكود أسفل منطقة البرمجة ويمكنك المحاولة مرة أخرى عن طريق تعديل الوصف او السؤال!",
      "RobustnessExplanation": "شرح المتانة: اختبرنا متانة نتيجتك بعد ارسال الطلب (نص الرسالة الى الAI) عبر ChatGPT عدة مرات والتحقق إذا سيتم ارجاع الكود الصحيح باستمرار",
      "Your word count: ": "عدد كلماتك: ",
      "Lowest word count: ": "اقل عدد من الكلمات: ",
      "Your prompt is very robust! Perfect Score": "رسالتك متينة جدا ممتازة. نتيجة متميزة",
      "Your prompt is robust but fails on repeated attempts.": "رسالتك متينة ممتازة، ولكن تفشل مع تكرار المحاولات",
      "Your prompt is not very robust.": "رسالتك ليست متينة بشكل كافي",
      "Back": "رجوع",
      "Finish": "إنهاء",
      "Next": "التالي",
      'Please select language:': 'يرجى تحديد اللغة:',
      'Please select below the class you are currently enrolled in!': 'الرجاء التحديد أدناه الفصل الدراسي المسجل فيه حاليًا!',
      "Exercise #1": "التمرين #1",
      "Exercise #2": "التمرين #2",
      "Exercise #3": "التمرين #3",
      "Exercise #4": "التمرين #4",
      "Exercise #5": "التمرين #5",
      "Class Registration": "تسجيل الفصل"
    }
  },
  cn: {
    translation: {
      "ChatGPT response:": "中文",
      "PythonPrompt": "中文 ",
      "PythonPromptScripting": "中文",
      "CPrompt": "中文",
      "JavaPrompt": "中文",
      "Asking...": "中文",
      "Something went wrong. Refresh your page and try again.": "中文",
      "Something went wrong! We will look into it, try again at a later time": "Algo correu mal! Vamos analisar o problema, tente novamente, mais tarde",
      "You pass!": "Passou!",
      "Write your ChatGPT prompt here": "Escreva aqui a sua pergunta para o ChatGPT",
      "Click here to ask ChatGPT!": "Clique aqui para perguntar ao ChatGPT!",
      "Code Running response:": "Resultado da execução do código",
      "View the problem": "Ver o problema",
      "FirstBlurb": "中文",
      "SecondBlurb": "中文",
      'ThirdBlurb': "中文",
      "RobustnessExplanation": "We tested the robustness of your score by running your prompt through chatGPT multiple time and checking if it consistently produces correct code.",
      "Your word count: ": "Your word count: ",
      "Lowest word count: ": "Lowest word count: ",
      "Your prompt is very robust! Perfect Score": "Your prompt is very robust! Perfect Score",
      "Your prompt is robust but fails on repeated attempts.": "Your prompt is robust but fails on repeated attempts.",
      "Your prompt is not very robust.": "Your prompt is not very robust.",
      "Back": "Back",
      "Finish": "Finish",
      "Next": "Next",
      'Please select language:': 'Please select language:',
      'Please select below the class you are currently enrolled in!': 'Please select below the class you are currently enrolled in!',
      "Exercise #1": "Exercise #1",
      "Exercise #2": "Exercise #2",
      "Exercise #3": "Exercise #3",
      "Exercise #4": "Exercise #4",
      "Exercise #5": "Exercise #5",
      "Class Registration": "Class Registration"
    }
  }
};

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: "en", // language to use, more information here: https://www.i18next.com/overview/configuration-options#languages-namespaces-resources
    // you can use the i18n.changeLanguage function to change the language manually: https://www.i18next.com/overview/api#changelanguage
    // if you're using a language detector, do not define the lng option

    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;