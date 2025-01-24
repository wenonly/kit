import { useScript } from "@wenonly/react-hooks";
import { useMemoizedFn, usePrevious, useUnmount } from "ahooks";
import { Spin } from "antd";
import { isEqual } from "lodash-es";
import type * as MonacoEditor from "monaco-editor/esm/vs/editor/editor.api";
import React, { useEffect, useImperativeHandle, useRef, useState } from "react";
import styles from "./index.module.less";
const options = {
  selectOnLineNumbers: true,
  automaticLayout: true,
};

interface IProps {
  sdkUrl: string; // amis sdk
  value?: string;
  language?: string;
  height?: string | number;
  options?: MonacoEditor.editor.IStandaloneEditorConstructionOptions;
  style?: React.CSSProperties;
  className?: string;
  theme?: string;
  onChange?: (v: string) => void;
}

export interface RenderProgramRefType {
  formatDocument: () => void;
}

const CodeEditor = React.forwardRef<RenderProgramRefType | undefined, IProps>(
  (props, ref) => {
    const editor = useRef<MonacoEditor.editor.IStandaloneCodeEditor>();
    const editorContainer = useRef(null);
    const monacoModuleRef = useRef<typeof MonacoEditor>();
    const [loading, setLoading] = useState(true);
    const __prevent_trigger_change_event = useRef(false);
    const _subscription = useRef<MonacoEditor.IDisposable>();

    const initEditor = useMemoizedFn(() => {
      if (editorContainer.current && monacoModuleRef.current) {
        editor.current = monacoModuleRef.current.editor.create(
          editorContainer.current,
          {
            value: props.value,
            language: props.language ?? "javascript",
            ...options,
            ...props.options,
            theme: props.theme ?? "vs-dark",
          }
        );
        _subscription.current = editor.current.onDidChangeModelContent(() => {
          if (!__prevent_trigger_change_event.current && editor.current) {
            props.onChange?.(editor.current.getValue());
          }
        });
        setLoading(false);
      }
    });

    useScript(props.sdkUrl, {
      js: {
        async: true,
      },
      onReady: () => {
        // 搜索public/amis/sdk.js文件中/*!examples/loadMonacoEditor.ts*/,下方就是monaco编辑器的id
        (window as any).amis.require(
          ["b14f4a4"],
          (monaco: typeof MonacoEditor) => {
            monacoModuleRef.current = monaco;
            initEditor();
          }
        );
      },
    });

    const previousOptions = usePrevious(props.options);
    const previousTheme = usePrevious(props.theme);
    const previousLanguage = usePrevious(props.language);
    const previousHeight = usePrevious(props.height);
    useEffect(() => {
      const model = editor.current?.getModel();
      if (
        editor.current &&
        model &&
        props.value !== null &&
        props.value !== model.getValue()
      ) {
        __prevent_trigger_change_event.current = true;
        editor.current.pushUndoStop();
        // pushEditOperations says it expects a cursorComputer, but doesn't seem to need one.
        // @ts-expect-error
        model.pushEditOperations(
          [],
          [
            {
              range: model.getFullModelRange(),
              text: props.value,
            },
          ]
        );
        editor.current.pushUndoStop();
        __prevent_trigger_change_event.current = false;
      }
      if (model && previousTheme !== props.theme) {
        monacoModuleRef.current?.editor.setTheme(props.theme ?? "vs-dark");
      }
      if (model && previousLanguage !== props.language) {
        monacoModuleRef.current?.editor.setModelLanguage(
          model,
          props.language ?? "javascript"
        );
      }
      if (editor && props.height !== previousHeight) {
        editor.current?.layout();
      }
      if (!isEqual(previousOptions, props.options)) {
        editor.current?.updateOptions(props.options ?? {});
      }
    }, [
      previousHeight,
      previousLanguage,
      previousOptions,
      previousTheme,
      props.height,
      props.language,
      props.options,
      props.theme,
      props.value,
    ]);

    useUnmount(() => {
      const model = editor.current?.getModel();
      editor.current?.dispose();
      model?.dispose();
      _subscription.current?.dispose();
    });

    const formatDocument = () => {
      editor.current?.getAction("editor.action.formatDocument")?.run(); // 格式化
    };

    useImperativeHandle(ref, () => ({
      formatDocument,
    }));

    return (
      <div
        className={`${styles.content} ${props.className ?? ""}`}
        style={{ height: props.height ?? "100%", ...(props.style ?? {}) }}
      >
        <div ref={editorContainer} style={{ height: props.height ?? "100%" }}>
          {loading && (
            <Spin
              style={{ margin: "0 auto", display: "block", marginTop: "45%" }}
            />
          )}
        </div>
      </div>
    );
  }
);

CodeEditor.defaultProps = {
  language: "json",
};

export default CodeEditor;
