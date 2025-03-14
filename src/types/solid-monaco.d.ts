declare module 'solid-monaco' {
  import { Component } from 'solid-js';
  import * as monaco from 'monaco-editor';

  interface EditorProps {
    value: string;
    onChange?: (value: string, event: monaco.editor.IModelContentChangedEvent) => void;
    language?: string;
    theme?: string;
    options?: any;
    loadingState?: JSX.Element;
    class?: string;
    path?: string;
    overrideServices?: any;
    width?: string;
    height?: string;
    saveViewState?: boolean;
    onMount?: (monaco: typeof monaco, editor: monaco.editor.IStandaloneCodeEditor) => void;
    onBeforeUnmount?: (monaco: typeof monaco, editor: monaco.editor.IStandaloneCodeEditor) => void;
  }

  export const MonacoEditor: Component<EditorProps>;
}