import React from "react";
import { makeStyles } from "@material-ui/core/styles";

import Card from "@material-ui/core/Card";

import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";

import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import Collapse from "@material-ui/core/Collapse";
import Typography from "@material-ui/core/Typography";

import Input from "@material-ui/core/Input";
import Checkbox from "@material-ui/core/Checkbox";

import InfoIcon from "@material-ui/icons/Info";

const useStyles = makeStyles(theme => ({
  nested: {
    padding: theme.spacing(2),
    margin: theme.spacing(2)
  },
  half: {
    width: "50%",
    marginRight: theme.spacing(1)
  },
  headingCell: {
    paddingRight: theme.spacing(2)
  }
}));

export default function InfoPanel(props) {
  const { drawerOpen } = props;

  const [state, setState] = React.useState({
    open: true
  });

  const toggleOpen = () => {
    if (!drawerOpen) {
      return;
    }
    setState({
      open: !state.open
    });
  };

  return (
    <List>
      <ListItem button={drawerOpen} onClick={toggleOpen} key="Info">
        <ListItemIcon>
          <InfoIcon />
        </ListItemIcon>
        <ListItemText primary="Info" />
      </ListItem>
      <Collapse in={state.open && drawerOpen} timeout="auto" unmountOnExit>
        <InfoCard editor={props.editor} />
      </Collapse>
    </List>
  );
}

function InfoCard(props) {
  const classes = useStyles();

  const [closest, setClosest] = React.useState({index: 0, props: []});

  React.useEffect(() => {
    props.editor.onUpdate((editor) => {
      if (editor.closest) {
        setClosest(
          {
            index: editor.closest.editorMeta.index,
            name: `${editor.closest.constructor.name} ${editor.closest.editorMeta.index.toString().padStart(6,"0")}`,
            props: editor.closest.getProps()
          });
      }
    });
  })

  return (
    <Card className={classes.nested}>
      <Typography noWrap variant="h6" component="h2" gutterBottom>
        {closest.name}
      </Typography>
      <Table size="small" padding="none" aria-label="info table">
        <TableBody>
          {closest.props.map(row => (
            <TableRow key={row.name}>
              <TableCell
                component="th"
                scope="row"
                className={classes.headingCell}
              >
                <Typography noWrap color="textSecondary">
                  {row.name}
                </Typography>
              </TableCell>
              <TableCell align="right" scope="row">
                <EditorValue
                  type={row.type}
                  subType={row.subType}
                  value={row.value}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function EditorValue(props) {
  const inputComponents = {
    Uint8Input,
    Int8Input,
    Uint16Input,
    Int16Input,
    Uint32Input,
    Int32Input
  };
  let InputTag;
  switch (props.type) {
    case "Point3":
      InputTag = inputComponents[`${props.subType}Input`];
      return (
        <div>
          <InputTag placeholder="x" value={props.value.x} />
          <InputTag placeholder="y" value={props.value.y} />
          <InputTag placeholder="z" value={props.value.z} />
        </div>
      );
    case "Point2":
      InputTag = inputComponents[`${props.subType}Input`];
      return (
        <div>
          <InputTag placeholder="x" value={props.value.x} />
          <InputTag placeholder="y" value={props.value.y} />
        </div>
      );
    case "Boolean":
      return <Checkbox color="default" value={props.value} />;
    default:
      InputTag = inputComponents[`${props.type}Input`];
      return <InputTag value={props.value} />;
  }
}

function Uint8Input(props) {
  return (
    <Input
      type="number"
      inputProps={{ min: 0, max: 255 }}
      value={props.value}
    />
  );
}

function Int8Input(props) {
  return (
    <Input
      type="number"
      inputProps={{ min: -127, max: 127 }}
      value={props.value}
    />
  );
}

function Uint16Input(props) {
  return (
    <Input
      type="number"
      inputProps={{ min: 0, max: 65535 }}
      value={props.value}
    />
  );
}

function Int16Input(props) {
  return (
    <Input
      type="number"
      inputProps={{ min: -32767, max: 32767 }}
      value={props.value}
    />
  );
}

function Uint32Input(props) {
  return (
    <Input
      type="number"
      inputProps={{ min: 0, max: 4294967295 }}
      value={props.value}
    />
  );
}

function Int32Input(props) {
  return (
    <Input
      type="number"
      inputProps={{ min: -2147483647, max: 2147483647 }}
      value={props.value}
    />
  );
}
