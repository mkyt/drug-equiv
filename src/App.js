import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-bootstrap-typeahead/css/Typeahead.css';
import 'react-bootstrap-typeahead/css/Typeahead.bs5.css';
import './App.scss';

import DRUGS from './drugs.json';
import NAME2ID from './name2id.json';

import { useState } from 'react';
import { Typeahead } from 'react-bootstrap-typeahead';
import { Button, ButtonGroup, Container, Label, Row, Col, Form, FormGroup, FormFeedback, Input, InputGroup, InputGroupText } from 'reactstrap';

var NAMES = [];
for (const key of Object.keys(NAME2ID)) {
  NAMES.push(key);
}

function collect(drugs) {
  // drug_id -> amount
  let drug2amount = {};
  for (const drug of drugs) {
    if (isNaN(drug.amount)) {
      continue;
    }
    const drug_id = NAME2ID[drug.name];
    if (!drug_id) continue;
    if (drug2amount[drug_id] === undefined) {
      drug2amount[drug_id] = 0;
    }
    drug2amount[drug_id] += drug.amount;
  }
  return drug2amount;
}

function calc_equiv(d2amt) {
  let converted = { 'cp_fga': 0, 'cp_sga': 0, 'bpd': 0, 'imp': 0, 'dzp': 0 };
  let unconverted = { 'cp_fga': [], 'cp_sga': [], 'bpd': [], 'imp': [], 'dzp': [] };
  for (const [drug_id, amount] of Object.entries(d2amt)) {
    const equiv = DRUGS[drug_id].equiv_potency;
    for (const [equiv_key, equiv_potency] of Object.entries(equiv)) {
      if (!isNaN(equiv_potency)) {
        converted[equiv_key] += amount * equiv_potency;
      } else {
        unconverted[equiv_key].push(drug_id);
      }
    }
  }
  return {converted, unconverted};
}


function drugname2unit(drug_name) {
  if (drug_name in NAME2ID) {
    return DRUGS[NAME2ID[drug_name]].unit;
  } else {
    return '???';
  }
}

function hiraToKata(str) {
  return str.replace(/[\u3041-\u3096]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );
}

function summarize(id2mat) {
  const p = [];
  for (const [drug_id, amount] of Object.entries(id2mat)) {
    p.push(`${DRUGS[drug_id].generic_name} ${amount}${DRUGS[drug_id].unit}`);
  }
  if (p.length > 0) {
    return p.join('、')
  } else {
    return 'なし';
  }
}

function newDrug() {
  return { name: '', amount: NaN };
}


function DownloadBtn(props) {
  const downloadFile = () => {
    // create file in browser
    const id2amt = collect(props.data.drugs);
    const res = [];
    for (const [drug_id, amount] of Object.entries(id2amt)) {
      res.push({ id: drug_id, name: DRUGS[drug_id].generic_name, amount: amount });
    }
    const json = JSON.stringify({
      participant_id: props.data.participant_id,
      date: props.data.date,
      drugs: res,
    }, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const href = URL.createObjectURL(blob);

    // create "a" HTLM element with href to file
    const link = document.createElement("a");
    link.href = href;
    link.download = "drugs.json";
    document.body.appendChild(link);
    link.click();

    // clean up "a" element & remove ObjectURL
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  }
  return <Button color='primary' onClick={downloadFile}>ダウンロード</Button>;
}

function getToday() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const dd = new Date(d.getTime() - (offset * 60 * 1000));
  return dd.toISOString().split('T')[0];
}

function DrugEditor() {
  const [drugs, setDrugs] = useState([newDrug()]);
  const [participant_id, setParticipantId] = useState('');
  const [date, setDate] = useState(getToday());

  const addDrug = (idx) => {
    const new_drugs = [...drugs];
    new_drugs.splice(idx + 1, 0, newDrug());
    setDrugs(new_drugs);
  }

  const removeDrug = (idx) => {
    if (drugs.length > 1) {
      setDrugs(drugs.filter((s, sidx) => idx !== sidx));
    } else {
      setDrugs([newDrug()]);
    }
  }

  const onFormChange = (idx, drug) => {
    console.log(drug);
    const newDrugs = drugs.map((s, sidx) => {
      if (idx !== sidx) return s;
      return Object.assign({}, s, drug);
    });
    setDrugs(newDrugs);
  }

  const onIDChange = (e) => {
    setParticipantId(e.target.value);
  }

  const onDateChange = (e) => {
    setDate(e.target.value);
  }

  return (
    <>
      <Form noValidate={true}>
        <FormGroup row>
          <h4>被験者情報</h4>
          <Col sm={6}>
            <Label for="participant_id" className="visually-hidden">ID</Label>
            <Input
              type="text"
              name="participant_id"
              id="participant_id"
              placeholder="ID"
              value={participant_id}
              onChange={onIDChange}
              valid={participant_id.length > 0}
            />
          </Col>
          <Col sm={4}>
            <Label for="date" className="visually-hidden">日付</Label>
            <Input
              type="date"
              name="date"
              id="date"
              value={date}
              onChange={onDateChange}
              valid={date.length > 0}
            />
          </Col>
        </FormGroup>
        <h4>服薬情報</h4>
        {drugs.map((drug, idx) => (
          <DrugForm
            key={idx}
            onChange={(change) => onFormChange(idx, change)}
            addDrug={() => addDrug(idx)}
            removeDrug={() => removeDrug(idx)}
            selected={drug.name}
            amount={drug.amount}
          />
        ))}
      </Form >
      <DrugSummary drugs={drugs} />
      <div>
        <DownloadBtn data={{ drugs, participant_id, date }} />
        <Button className='mx-2' onClick={() => {
          setDrugs([newDrug()]);
          setParticipantId('');
          setDate(getToday());
        }}>リセット</Button>
      </div>
    </>
  );
}

const Feedback = (props) => {
  console.log(props);
  if (props.selected in NAME2ID) {
    return <FormFeedback valid>{DRUGS[NAME2ID[props.selected]]['class']}</FormFeedback>;
  } else {
    return null;
  }
}


function DrugForm(props) {
  const onDrugChange = (selected) => {
    if (selected.length === 0) {
      props.onChange({ name: '' });
    } else {
      const drug = selected[0];
      if (drug !== props.selected) {
        props.onChange({ name: drug });
      }
    }
  }

  const onAmountChange = (e) => {
    props.onChange({amount: e.target.value === '' ? NaN : Number(e.target.value)});
  }

  return (
    <FormGroup row>
      <Col sm={6}>
        <Typeahead
          id={'typeahead' + props.idx}
          options={NAMES}
          placeholder="Choose a drug..."
          onChange={onDrugChange}
          clearButton={true}
          selected={props.selected === '' ? [] : [props.selected]}
          isValid={props.selected !== '' && (props.selected in NAME2ID)}
          filterBy={(option, props) => {
            const input = hiraToKata(props.text);
            return option.startsWith(input);
          }}
          className={(props.selected !== '' && (props.selected in NAME2ID)) ? "is-valid" : ""}
        />
        <Feedback selected={props.selected} />
      </Col>
      <Col sm={4}>
        <InputGroup>
          <Input
            placeholder="Amount"
            type="number"
            onChange={onAmountChange}
            value={isNaN(props.amount) ? '' : props.amount}
            valid={!isNaN(props.amount)}
            min={0}
          />
          <InputGroupText>{drugname2unit(props.selected)}</InputGroupText>
        </InputGroup>
      </Col>
      <Col sm={2}>
        <ButtonGroup>
          <Button color="success" onClick={props.addDrug}>+</Button>
          <Button color="danger" onClick={props.removeDrug}>-</Button>
        </ButtonGroup>
      </Col>
    </FormGroup>
  )
}

function DrugSummary(props) {
  const id2amt = collect(props.drugs);
  const equiv = calc_equiv(id2amt);
  const unconv_cp = [...equiv.unconverted.cp_fga, ...equiv.unconverted.cp_sga];

  const stringify_leftovers = (ids) => {
    console.log(ids);
    if (ids.length === 0) {
      return '';
    }
    const p = [];
    for (const drug_id of ids) {
      p.push(`${DRUGS[drug_id].generic_name} ${id2amt[drug_id]}${DRUGS[drug_id].unit}`);
    }
    return ' + ' + p.join('、');
  }

  return (
    <>
      <h4>要約</h4>
      <p>{summarize(id2amt)}</p>
      <h4>等価換算値</h4>
      <ul>
        <li>CP換算: {(equiv.converted.cp_fga + equiv.converted.cp_sga).toFixed(2)}mg (FGA: {equiv.converted.cp_fga.toFixed(2)}mg, SGA: {equiv.converted.cp_sga.toFixed(2)}mg){ stringify_leftovers(unconv_cp) }</li>
        <li>BPD換算: {equiv.converted.bpd.toFixed(2)}mg{ stringify_leftovers(equiv.unconverted.bpd) }</li>
        <li>IMP換算: {equiv.converted.imp.toFixed(2)}mg{ stringify_leftovers(equiv.unconverted.imp) }</li>
        <li>DZP換算: {equiv.converted.dzp.toFixed(2)}mg{ stringify_leftovers(equiv.unconverted.dzp) }</li>
      </ul>
    </>
  )
}

function App() {
  return (
    <Container>
      <Row>
        <Col>
          <h1 className="my-4">向精神薬情報入力ツール</h1>
          <DrugEditor />
        </Col>
      </Row>
    </Container>
  );
}

export default App;
