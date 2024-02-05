import React, { useEffect, useState } from "react";
import axios from "axios";
import { useSearchParams } from "react-router-dom";

export default function Dashboard(){
    const [searchParams] = useSearchParams();
    const [data, setData] = useState([]);
    const [dataDetail, setDataDetail] = useState<any>(data&&data.map((dt)=>{
        if(mission_id){
            if(dt._id==mission_id){
                setDataDetail(dt)
            }
        }
    }))

    const mission_id = searchParams.get("mission_id")
    axios.get('http://localhost:8080/api/dropauth/getData',{})
    .then((res)=>{
        setData(res&&res.data)
    })
    //console.log(data)
    //console.log(searchParams.get("mission_id"));
    useEffect(()=>{
        
    },[])
    console.log("dt",dataDetail)
    return(
        <div className="background">
            <nav className="navbar navbar-expand-lg bg-body-tertiary">
            <div className="container-fluid">
                <a className="navbar-brand text-white" href="#">Navbar</a>
                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
                <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse" id="navbarSupportedContent">
                <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                    <li className="nav-item">
                    <a className="nav-link active text-white" aria-current="page" href="#">Home</a>
                    </li>
                    <li className="nav-item">
                    <a className="nav-link text-white" href="#">Link</a>
                    </li>
                </ul>
                <button className="btn btn-outline-success text-white" type="submit">Login</button>
                </div>
            </div>
            </nav>
            <div className="container py-5 container-format">
                <div className="row mb-4 ">
                    <div className="col-lg-7 mx-auto d-flex flex-column">
                        <label className="title">{}</label>
                        <span className="desc">{}</span>
                        <span className="time text-white">{} - {} 12:00 GMT+07:00 </span>
                    </div>
                </div>
                <div className="row mt-2">
                    <div className="col-lg-7 mx-auto">
                        <div>
                            <h3 className="fs-4 text-white">Mission</h3>
                            <div className="mt-3 px-3 btn-ms py-2">
                                <a href={`${"A"}`} className="bg-transparent px-3 py-2 btn btn-m" target="_blank">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-caret-right-fill icon text-white" viewBox="0 0 16 16">
                                    <path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"/>
                                    </svg>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" x="0px" y="0px"  viewBox="0 0 48 48">
                                    <path fill="#03A9F4" d="M42,12.429c-1.323,0.586-2.746,0.977-4.247,1.162c1.526-0.906,2.7-2.351,3.251-4.058c-1.428,0.837-3.01,1.452-4.693,1.776C34.967,9.884,33.05,9,30.926,9c-4.08,0-7.387,3.278-7.387,7.32c0,0.572,0.067,1.129,0.193,1.67c-6.138-0.308-11.582-3.226-15.224-7.654c-0.64,1.082-1,2.349-1,3.686c0,2.541,1.301,4.778,3.285,6.096c-1.211-0.037-2.351-0.374-3.349-0.914c0,0.022,0,0.055,0,0.086c0,3.551,2.547,6.508,5.923,7.181c-0.617,0.169-1.269,0.263-1.941,0.263c-0.477,0-0.942-0.054-1.392-0.135c0.94,2.902,3.667,5.023,6.898,5.086c-2.528,1.96-5.712,3.134-9.174,3.134c-0.598,0-1.183-0.034-1.761-0.104C9.268,36.786,13.152,38,17.321,38c13.585,0,21.017-11.156,21.017-20.834c0-0.317-0.01-0.633-0.025-0.945C39.763,15.197,41.013,13.905,42,12.429"></path>
                                    </svg>
                                    {/* <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-caret-down-fill icon" viewBox="0 0 16 16">
                                        <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
                                    </svg> */}
                                    <span className="text-sm text-white">Retweet the Tweet</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* <div className="nenmodal">
                <div className="ndmodal">
                    <div className="titlemodal">Tiêu đề của Modal</div>
                    <div className="iconClose">
                        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="currentColor" className="bi bi-x-lg" viewBox="0 0 16 16">
                        <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
                        </svg>
                    </div>
                </div>
            </div> */}

        </div>
    )
}