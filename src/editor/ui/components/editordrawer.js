import React from "react";
import clsx from "clsx";
import { makeStyles } from "@material-ui/core/styles";

import Drawer from "@material-ui/core/Drawer";
import IconButton from "@material-ui/core/IconButton";
import Divider from "@material-ui/core/Divider";

import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";

import EditorMode from "./editormode";
import InfoPanel from "./infopanel";

const drawerWidth = 320;

const useStyles = makeStyles(theme => ({
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: "nowrap"
  },
  drawerHeader: {
    display: "flex",
    alignItems: "center",
    padding: theme.spacing(0, 1),
    ...theme.mixins.toolbar,
    justifyContent: "flex-end"
  },
  drawerOpen: {
    width: drawerWidth,
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen
    })
  },
  drawerClose: {
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen
    }),
    overflowX: "hidden",
    width: theme.spacing(7) + 1
  }
}));

export default function EditorDrawer(props) {
  const [state, setState] = React.useState({
    open: false
  });

  const toggleDrawer = () => {
    setState({
      open: !state.open
    });
  };

  const classes = useStyles();

  return (
    <Drawer
      variant="permanent"
      className={clsx(classes.drawer, {
        [classes.drawerOpen]: state.open,
        [classes.drawerClose]: !state.open
      })}
      classes={{
        paper: clsx({
          [classes.drawerOpen]: state.open,
          [classes.drawerClose]: !state.open
        })
      }}
      open={state.open}
    >
      <div className={classes.drawerHeader}>
        <IconButton onClick={toggleDrawer}>
          {state.open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>
      </div>

      <Divider />
      <EditorMode editor={props.editor} />
      <Divider />
      <InfoPanel drawerOpen={state.open} editor={props.editor} />
    </Drawer>
  );
}
