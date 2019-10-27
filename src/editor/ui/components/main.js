import React from "react";
import {
  makeStyles,
  ThemeProvider,
  createMuiTheme
} from "@material-ui/core/styles";
import useMediaQuery from "@material-ui/core/useMediaQuery";
import EditorDrawer from "./editordrawer";

const useStyles = makeStyles(theme => ({
  root: {
    display: "flex"
  }
}));

export default function Main(props) {
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

  const theme = React.useMemo(
    () =>
      createMuiTheme({
        palette: {
          type: prefersDarkMode ? "dark" : "light"
        }
      }),
    [prefersDarkMode]
  );

  const classes = useStyles();
  return (
    <ThemeProvider theme={theme}>
      <EditorDrawer editor={props.editor} className={classes.drawerHeader} />)
    </ThemeProvider>
  );
}
