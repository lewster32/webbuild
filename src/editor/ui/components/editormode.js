import React from "react";

import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";

import PanIcon from "@material-ui/icons/OpenWith";
import SelectIcon from "@material-ui/icons/SelectAll";
import EditIcon from "@material-ui/icons/Edit";

export default function EditorMode() {
  const [state, setState] = React.useState({
    mode: 0
  });

  const setMode = mode => {
    setState({
      mode: mode
    });
  };

  return (
    <List>
      <ListItem
        button
        key="Pan Mode"
        selected={state.mode === 0}
        onClick={event => setMode(0)}
      >
        <ListItemIcon>
          <PanIcon />
        </ListItemIcon>
        <ListItemText primary="Pan Mode" />
      </ListItem>
      <ListItem
        button
        key="Select Mode"
        selected={state.mode === 1}
        onClick={event => setMode(1)}
      >
        <ListItemIcon>
          <SelectIcon />
        </ListItemIcon>
        <ListItemText primary="Select Mode" />
      </ListItem>
      <ListItem
        button
        key="Edit Mode"
        selected={state.mode === 2}
        onClick={event => setMode(2)}
      >
        <ListItemIcon>
          <EditIcon />
        </ListItemIcon>
        <ListItemText primary="Edit Mode" />
      </ListItem>
    </List>
  );
}
