import React from "react";
import ReactDOM from "react-dom";

import Main from "./components/main";
// Needed for React Developer Tools
window.React = React;

export default function UI(editor) {  
  ReactDOM.render(<Main editor={editor} />, document.getElementById("app"));
}
