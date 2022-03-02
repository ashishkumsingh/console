import {
  autocompletion,
  closeCompletion,
  completionKeymap,
  currentCompletions,
  setSelectedCompletion,
} from '@codemirror/autocomplete';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/closebrackets';
import { defaultKeymap, insertNewlineAndIndent } from '@codemirror/commands';
import { HighlightStyle, tags } from '@codemirror/highlight';
import { history, historyKeymap } from '@codemirror/history';
import { indentOnInput } from '@codemirror/language';
import { lintKeymap } from '@codemirror/lint';
import { bracketMatching } from '@codemirror/matchbrackets';
import { highlightSelectionMatches } from '@codemirror/search';
import { EditorState, Prec } from '@codemirror/state';
import {
  EditorView,
  highlightSpecialChars,
  keymap,
  placeholder as codeMirrorPlaceholder,
  ViewPlugin,
  ViewUpdate,
} from '@codemirror/view';
import { YellowExclamationTriangleIcon } from '@console/shared';
import CloseButton from '@console/shared/src/components/close-button';
import { PromQLExtension } from 'codemirror-promql';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { PROMETHEUS_BASE_PATH } from '../graphs';
import { PrometheusEndpoint } from '../graphs/helpers';
import { useSafeFetch } from '../utils';
import './_promql-expression-input.scss';

interface PromQLExpressionInputProps {
  value: string;
  onValueChange: (value: string) => void;
  onExecuteQuery?: () => void;
}

const promqlExtension = new PromQLExtension();

export const theme = EditorView.theme({
  '.cm-scroller': {
    fontFamily: 'inherit',
  },
  '&': {
    '&.cm-editor.cm-focused': {
      outline: 'none',
    },
  },
  '.cm-tooltip.cm-completionInfo': {
    backgroundColor: 'var(--pf-global--palette--blue-50)',
    border: 'none',
    marginTop: '-11px',
    padding: '10px',
  },
  '.cm-completionInfo.cm-completionInfo-right': {
    '&:before': {
      content: "' '",
      height: '0',
      position: 'absolute',
      width: '0',
      left: '-20px',
      borderWidth: '10px',
      borderStyle: 'solid',
      borderColor: 'transparent',
      borderRightColor: 'var(--pf-global--palette--blue-50)',
    },
    marginLeft: '12px',
  },
  '.cm-completionInfo.cm-completionInfo-left': {
    '&:before': {
      content: "' '",
      height: '0',
      position: 'absolute',
      width: '0',
      right: '-20px',
      borderWidth: '10px',
      borderStyle: 'solid',
      borderColor: 'transparent',
      borderLeftColor: 'var(--pf-global--palette--blue-50)',
    },
    marginRight: '12px',
  },
  '.cm-completionIcon': {
    fontFamily: 'codicon',
    width: '1.5em',
    verticalAlign: 'middle',
  },
  '.cm-selectionMatch': {
    backgroundColor: '#E7F1F4',
  },
  '.cm-completionDetail': {
    float: 'right',
    color: '#999',
  },
  '.cm-tooltip.cm-tooltip-autocomplete': {
    boxShadow: 'var(--pf-global--BoxShadow--sm)',
    '& > ul': {
      fontFamily: 'var(--pf-c-code-block__pre--FontFamily), monospace',
      fontSize: 'var(--pf-global--FontSize--sm)',
    },
    '& > ul > li[aria-selected]': {
      backgroundColor: 'var(--pf-global--palette--blue-50)',
      color: 'unset',
    },
    '& > ul > li': {
      padding: '2px 1em 2px 3px',
    },
  },
  '.cm-completionMatchedText': {
    textDecoration: 'none',
    fontWeight: 'bold',
    color: 'var(--pf-global--palette--blue-400)',
  },
  '.cm-completionIcon-function, .cm-completionIcon-method': {
    '&:after': { content: "'\\ea8c'" },
    color: '#652d90',
  },
  '.cm-completionIcon-class': {
    '&:after': { content: "'○'" },
  },
  '.cm-completionIcon-interface': {
    '&:after': { content: "'◌'" },
  },
  '.cm-completionIcon-variable': {
    '&:after': { content: "'𝑥'" },
  },
  '.cm-completionIcon-constant': {
    '&:after': { content: "'\\eb5f'" },
    color: '#007acc',
  },
  '.cm-completionIcon-type': {
    '&:after': { content: "'𝑡'" },
  },
  '.cm-completionIcon-enum': {
    '&:after': { content: "'∪'" },
  },
  '.cm-completionIcon-property': {
    '&:after': { content: "'□'" },
  },
  '.cm-completionIcon-keyword': {
    '&:after': { content: "'\\eb62'" },
    color: '#616161',
  },
  '.cm-completionIcon-namespace': {
    '&:after': { content: "'▢'" },
  },
  '.cm-completionIcon-text': {
    '&:after': { content: "'\\ea95'" },
    color: '#ee9d28',
  },
});

export const selectAutocompleteOnHoverPlugin = ViewPlugin.fromClass(
  class SelectAutocompleteOnHoverPlugin {
    optionsLength: number = 0;
    lastIndex: number = -1;

    constructor(readonly view: EditorView) {
      this.view.dom.addEventListener('mousemove', (this.onMouseMove = this.onMouseMove.bind(this)));
    }

    update(update: ViewUpdate) {
      this.optionsLength = currentCompletions(update.state).length;
    }

    onMouseMove(e: Event) {
      const element = e.target;
      let index = -1;
      for (
        let dom = element as HTMLElement | null, match;
        dom && dom !== this.view.dom;
        dom = dom.parentNode as HTMLElement
      ) {
        if (
          dom.nodeName === 'LI' &&
          (match = /-(\d+)$/.exec(dom.id)) &&
          +match[1] < this.optionsLength
        ) {
          index = +match[1];
          break;
        }
      }

      if (index >= 0 && this.lastIndex !== index) {
        this.lastIndex = index;
        this.view.dispatch({ effects: setSelectedCompletion(index) });
      }
    }

    destroy() {
      this.view.dom.removeEventListener('mousemove', this.onMouseMove);
    }
  },
);

export const promqlHighlighter = HighlightStyle.define([
  { tag: tags.name, color: '#000' },
  { tag: tags.number, color: 'var(--pf-global--success-color--100)' },
  { tag: tags.string, color: 'var(--pf-global--danger-color--200)' },
  { tag: tags.keyword, color: 'var(--pf-global--default-color--200)', fontWeight: 'bold' },
  {
    tag: tags.function(tags.variableName),
    color: 'var(--pf-global--default-color--200)',
    fontWeight: 'bold',
  },
  { tag: tags.labelName, color: 'var(--pf-global--warning-color--200)' },
  { tag: tags.operator },
  { tag: tags.modifier, color: 'var(--pf-global--default-color--200)', fontWeight: 'bold' },
  { tag: tags.paren },
  { tag: tags.squareBracket },
  { tag: tags.brace },
  { tag: tags.invalid, color: 'red' },
  { tag: tags.comment, color: '#888', fontStyle: 'italic' },
]);

export const PromQLExpressionInput: React.FC<PromQLExpressionInputProps> = ({
  value,
  onExecuteQuery,
  onValueChange,
}) => {
  const { t } = useTranslation();
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const viewRef = React.useRef<EditorView | null>(null);
  const [metricNames, setMetricNames] = React.useState<Array<string>>([]);
  const [errorMessage, setErrorMessage] = React.useState<string | undefined>();

  const placeholder = t('public~Expression (press Shift+Enter for newlines)');

  const safeFetch = React.useCallback(useSafeFetch(), []);

  React.useEffect(() => {
    safeFetch(`${PROMETHEUS_BASE_PATH}/${PrometheusEndpoint.LABEL}/__name__/values`)
      .then((response) => {
        const metrics = response?.data;
        setMetricNames(metrics);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          const message =
            err?.response?.status === 403
              ? t('public~Access restricted.')
              : t('public~Failed to load metrics list.');
          setErrorMessage(message);
        }
      });
  }, [safeFetch, t]);

  const onClear = () => {
    if (viewRef.current !== null) {
      const length = viewRef.current.state.doc.toString().length;
      viewRef.current.dispatch({ changes: { from: 0, to: length } });
    }
    onValueChange('');
  };

  const onChange = (expressionValue: string) => {
    if (expressionValue !== value) {
      onValueChange(expressionValue);
    }
  };

  const onExecute = React.useCallback(() => {
    onExecuteQuery?.();
  }, [onExecuteQuery]);

  React.useEffect(() => {
    if (viewRef.current !== null) {
      const currentExpression = viewRef.current.state.doc.toString();
      if (currentExpression !== value) {
        viewRef.current.dispatch({
          changes: { from: 0, to: currentExpression.length, insert: value },
        });
      }
    }
  }, [value]);

  React.useEffect(() => {
    promqlExtension.setComplete({
      remote: {
        url: PROMETHEUS_BASE_PATH,
        httpMethod: 'GET',
        cache: { initialMetricList: metricNames },
      },
    });

    if (viewRef.current === null) {
      if (!containerRef.current) {
        throw new Error('expected CodeMirror container element to exist');
      }

      const startState = EditorState.create({
        doc: value,
        extensions: [
          theme,
          highlightSpecialChars(),
          history(),
          EditorState.allowMultipleSelections.of(true),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          autocompletion(),
          selectAutocompleteOnHoverPlugin,
          highlightSelectionMatches(),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ 'aria-label': placeholder }),
          keymap.of([
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...historyKeymap,
            ...completionKeymap,
            ...lintKeymap,
          ]),
          codeMirrorPlaceholder(placeholder),
          promqlHighlighter,
          promqlExtension.asExtension(),
          keymap.of([
            {
              key: 'Escape',
              run: (v: EditorView): boolean => {
                v.contentDOM.blur();
                return false;
              },
            },
          ]),
          Prec.override(
            keymap.of([
              {
                key: 'Enter',
                run: (): boolean => {
                  onExecute();
                  return true;
                },
              },
              {
                key: 'Shift-Enter',
                run: insertNewlineAndIndent,
              },
            ]),
          ),
          EditorView.updateListener.of((update: ViewUpdate): void => {
            const expressionValue = update.state.doc.toString();
            onChange(expressionValue);
          }),
        ],
      });

      const view = new EditorView({
        state: startState,
        parent: containerRef.current,
      });

      viewRef.current = view;

      view.focus();
    }
  }, [metricNames, onChange, onExecute, placeholder, safeFetch, value]);

  const handleBlur = () => {
    if (viewRef.current !== null) {
      closeCompletion(viewRef.current);
    }
  };

  return (
    <div className="query-browser__query pf-c-dropdown">
      <div
        ref={containerRef}
        onBlur={handleBlur}
        className="pf-c-form-control query-browser__query-input"
      ></div>
      {errorMessage && (
        <div
          className="pf-c-form__helper-text"
          id="helper-text-promql-expression-input"
          aria-live="polite"
        >
          <div className="pf-c-helper-text">
            <div className="pf-c-helper-text__item pf-m-warning">
              <YellowExclamationTriangleIcon className="pf-c-helper-text__item-icon" />
              <span className="pf-c-helper-text__item-text">{errorMessage}</span>
            </div>
          </div>
        </div>
      )}
      <CloseButton
        additionalClassName="query-browser__clear-icon"
        ariaLabel={t('public~Clear query')}
        onClick={onClear}
      />
    </div>
  );
};
