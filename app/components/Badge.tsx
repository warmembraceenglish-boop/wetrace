export default function Badge({children,tone="blue"}:{children:React.ReactNode;tone?:"blue"|"green"|"amber"|"red"|"slate"}){
 return <span className={"badge "+tone}>{children}</span>;
}
