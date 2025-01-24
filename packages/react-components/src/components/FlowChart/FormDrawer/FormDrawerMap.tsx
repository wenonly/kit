import { NodeEnum } from "../nodes/nodeEnum";
import NormalNodeForm from "./NormalNodeForm";

export const FormDrawerMap = {
  [NodeEnum.scale]: NormalNodeForm, // 这里最好异步加载
  [NodeEnum.questionnaire]: NormalNodeForm,
  [NodeEnum.report]: NormalNodeForm,
  [NodeEnum.examine]: NormalNodeForm,
};
