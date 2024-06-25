import { useDragScroll } from "@wenonly/react-hooks";

const RUseDragScroll = () => {
  const domRef = useDragScroll();

  return (
    <div
      ref={domRef}
      style={{
        height: 300,
        overflowY: "auto",
        border: "1px solid #ccc",
        padding: "0 20px",
      }}
    >
      <ol>
        {Array(100)
          .fill(1)
          .map((item, index) => (
            <li key={index}>{index}</li>
          ))}
      </ol>
    </div>
  );
};

export default RUseDragScroll;
